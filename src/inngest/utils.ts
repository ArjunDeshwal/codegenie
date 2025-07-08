import {Sandbox} from "@e2b/code-interpreter"
import { AgentResult, TextMessage } from "@inngest/agent-kit";

export async function getSandbox(sandboxID: string){
    const sandbox= await Sandbox.connect(sandboxID)
    return sandbox;
}
//Extract text content from the latest ai response
export function labAssistantTextMessageContent(result:AgentResult){
    const labAssistantTextMessageIndex=result.output.findLastIndex(
        (message)=>message.role==="assistant",
    )
    const message=result.output[labAssistantTextMessageIndex] as
    | TextMessage
    | undefined;

    return message?.content
        ?typeof message.content ==="string"
            ?message.content
            :message.content.map((c)=>c.text).join("")
        : undefined;
}