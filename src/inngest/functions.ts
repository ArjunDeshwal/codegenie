import { inngest } from "./client";
import {Sandbox} from "@e2b/code-interpreter"
import { getSandbox, labAssistantTextMessageContent } from "./utils";
import { gemini, createAgent, createTool, createNetwork } from "@inngest/agent-kit";
import {PROMPT} from "@/prompt"
import { z } from "zod";


export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const sandboxID = await step.run("get-sandbox-id", async ()=>{
      const sandbox = await Sandbox.create("codegenie-test-2");
      return sandbox.sandboxId;
    }) 
    
    const codeAgent=createAgent({
      name: "code-agent",
      description:"An expert coding agent",
      system: PROMPT,
      model:gemini({ model: "gemini-2.0-flash"}),
      tools:[
        createTool({
          name:"terminal",
          description:"Use the terminal to run commands",
          parameters:z.object({
            command:z.string(),
          }),
          handler: async({command}, {step})=>{
            return await step?.run("terminal", async() =>{
              const buffers={stdout:"", stderr:""};
              try {
                const sandbox=await getSandbox(sandboxID);
                const result=await sandbox.commands.run(command, {
                  onStdout(data: string) {
                    buffers.stdout+=data;
                  },
                  onStderr(data: string) {
                    buffers.stderr+=data;
                  },
                  
                });
                return result.stdout;
              } catch(e){
                console.error(
                  `Command failed: ${e}\n stdout: ${buffers.stdout}\n stderr:${buffers.stderr}`
                )
                return `Command failed: ${e}\n stdout: ${buffers.stdout}\n stderr:${buffers.stderr}`;
              }
            })
          }
        }),
        createTool({
          name:"createOrUpdateFiles",
          description:"Create or update files in the sandbox",
          parameters:z.object({
            files:z.array(
              z.object({
                path:z.string(),
                content:z.string()
              })
            )
          }),
          handler: async ({ files }, { step, network }) => {
            const newFiles=await step?.run("createOrUpdateFiles", async()=>{
              try{
                const updatedFiles=network.state.data.files || {};
                const sandbox=await getSandbox(sandboxID);
                for (const file of files){
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path]=file.content
                }
                return updatedFiles;
              }catch(e){
                return `Error: ${e}`
              }
            })
            if(typeof newFiles === "object"){
              network.state.data.files=newFiles;
            }
          }
        }),
        createTool({
          name:"readFiles",
          description:"Read files from the sandbox",
          parameters:z.object({
            files:z.array(z.string()),
          }),
          handler: async ({ files }, { step }) =>{
            return await step?.run("readFiles", async()=>{
              try{
                const sandbox=await getSandbox(sandboxID);
                const contents=[];
                for (const file of files){
                  const content=await sandbox.files.read(file);
                  contents.push({ path: file, content});
                }
                return JSON.stringify(contents)
              }catch (e){
                return `Error: ${e}`;
              }
            })
          }
        })
      ],
      lifecycle:{
        onResponse: async ({result, network})=>{
          const labAssistantMessageText=labAssistantTextMessageContent(result);

          if (labAssistantMessageText && network){
            if(labAssistantMessageText.includes("<task_summary>")){
              network.state.data.summary=labAssistantMessageText;
            }
          }
          return result;
        }
      }
    })
    const network=createNetwork({
      name:"coding-agent-network",
      agents:[codeAgent],
      maxIter:15,
      router: async({network})=>{
        const summary=network.state.data.summary;
        if(summary){
          return ;
        }
        return codeAgent;
      }
    })
    const result= await network.run(event.data.value);
    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox=await getSandbox(sandboxID);
      const host=sandbox.getHost(3000);
      return `https://${host}`;
    })
    
    
    return {
      url:sandboxUrl, 
      title:"Fragment",
      files:result.state.data.files,
      summary:result.state.data.summary,
    };
  },
);

