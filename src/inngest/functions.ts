import { Sandbox } from '@e2b/code-interpreter';
import {
  createAgent,
  createNetwork,
  createState,
  createTool,
  type Message,
  openai,
  type Tool,
} from '@inngest/agent-kit';
import { z } from 'zod';

import prisma from '@/lib/prisma';
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from '@/prompt';
import { FileCollection } from '@/types';
import { inngest } from './client';
import {
  getSandbox,
  lastAssistantTextMessageContent,
  parseAgentOutput,
} from './utils';
import { SANDBOX_TIMEOUT_IN_MS } from '@/constants';
import {
  validateSandboxPreview,
  validationMessage,
  type PreviewValidationResult,
} from './sandbox-health';
import {
  generatedFilesInputSchema,
  generatedFilesToolMessage,
  writeGeneratedFiles,
} from './generated-files';

interface AgentState {
  summary: string;
  files: FileCollection;
  previewValidated: boolean;
}

const tokenRouterModel = () =>
  openai({
    model: 'qwen/qwen3-coder-next',
    apiKey: process.env.TOKENROUTER_API_KEY,
    baseUrl:
      process.env.TOKENROUTER_BASE_URL || 'https://api.tokenrouter.com/v1/',
    defaultParameters: { temperature: 0.1 },
  });

const noGeneratedFilesValidation = (): PreviewValidationResult => ({
  ok: false,
  restarted: false,
  error:
    'No generated files were written. The starter template was not accepted as a completed build.',
});

export const codeAgentFunction = inngest.createFunction(
  { id: 'code-agent' },
  { event: 'code-agent/run' },
  async ({ event, step }) => {
    const sandboxId = await step.run('get-sandbox-id', async () => {
      const sandbox = await Sandbox.create('codegenie-nextjs');
      await sandbox.setTimeout(SANDBOX_TIMEOUT_IN_MS);
      return sandbox.sandboxId;
    });

    const previousMessages = await step.run(
      'get-previous-messages',
      async () => {
        const formattedMessages: Message[] = [];

        const messages = await prisma.message.findMany({
          where: {
            projectId: event.data.projectId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        });

        for (const message of messages) {
          formattedMessages.push({
            type: 'text',
            role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
            content: message.content,
          });
        }

        return formattedMessages.reverse();
      },
    );

    const state = createState<AgentState>(
      {
        summary: '',
        files: {},
        previewValidated: false,
      },
      {
        messages: previousMessages,
      },
    );

    // Create a new agent with a system prompt (you can add optional tools, too)
    const codeAgent = createAgent<AgentState>({
      name: 'code-agent',
      description: 'An expert coding agent',
      system: PROMPT,
      model: tokenRouterModel(),
      tools: [
        createTool({
          name: 'terminal',
          description: 'Use the terminal to run commands',
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run('terminal', async () => {
              const buffers = {
                stdout: '',
                stderr: '',
              };

              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffers.stderr += data;
                  },
                });

                return result.stdout;
              } catch (error) {
                console.error(
                  `command failed: ${error}\nstdOut: ${buffers.stdout}\nstdError: ${buffers.stderr}`,
                );
                return `command failed: ${error}\nstdOut: ${buffers.stdout}\nstdError: ${buffers.stderr}`;
              }
            });
          },
        }),
        createTool({
          name: 'createOrUpdateFiles',
          description:
            'Create or update one or more files in the sandbox. Every path must be a non-empty relative path such as "app/page.tsx".',
          parameters: generatedFilesInputSchema,
          handler: async (
            { files },
            { step, network }: Tool.Options<AgentState>,
          ) => {
            const writeResult = await step?.run(
              'createOrUpdateFiles',
              async () => {
                const sandbox = await getSandbox(sandboxId);
                return writeGeneratedFiles(
                  sandbox,
                  network.state.data.files || {},
                  files,
                );
              },
            );

            if (!writeResult) {
              network.state.data.previewValidated = false;
              return 'WRITE_ERROR: The file-writing step did not run. Call createOrUpdateFiles again.';
            }

            network.state.data.files = writeResult.files;
            network.state.data.previewValidated = false;
            return generatedFilesToolMessage(writeResult);
          },
        }),
        createTool({
          name: 'readFiles',
          description: 'Read files from the sandbox',
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run('readFiles', async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];

                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }

                return JSON.stringify(contents);
              } catch (error) {
                return 'Error: ' + error;
              }
            });
          },
        }),
        createTool({
          name: 'validateApp',
          description:
            'Validate that the generated Next.js app renders on port 3000. Call this after the final file change and fix every reported error before finishing.',
          parameters: z.object({}),
          handler: async (_input, { step, network }) => {
            if (Object.keys(network.state.data.files || {}).length === 0) {
              network.state.data.previewValidated = false;
              return validationMessage(noGeneratedFilesValidation());
            }

            const validation = await step?.run('validate-app', async () => {
              const sandbox = await getSandbox(sandboxId);
              return validateSandboxPreview(sandbox);
            });

            if (!validation) {
              network.state.data.previewValidated = false;
              return 'VALIDATION_ERROR: Validation did not run.';
            }

            network.state.data.previewValidated = validation.ok;
            return validationMessage(validation);
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantTextMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantTextMessageText && network) {
            const hasGeneratedFiles =
              Object.keys(network.state.data.files || {}).length > 0;

            if (
              lastAssistantTextMessageText.includes('<task_summary>') &&
              hasGeneratedFiles &&
              network.state.data.previewValidated
            ) {
              network.state.data.summary = lastAssistantTextMessageText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: 'coding-agent-network',
      agents: [codeAgent],
      maxIter: 15,
      defaultState: state,
      router: async ({ network }) => {
        const { files, previewValidated, summary } = network.state.data;
        const hasGeneratedFiles = Object.keys(files || {}).length > 0;

        if (summary && previewValidated && hasGeneratedFiles) {
          return;
        }

        return codeAgent;
      },
    });

    await network.run(event.data.value, { state });

    const hasGeneratedFiles = Object.keys(state.data.files || {}).length > 0;
    let previewValidation = hasGeneratedFiles
      ? await step.run('validate-generated-app', async () => {
          const sandbox = await getSandbox(sandboxId);
          return validateSandboxPreview(sandbox);
        })
      : noGeneratedFilesValidation();

    if (
      !previewValidation.ok &&
      Object.keys(state.data.files || {}).length > 0
    ) {
      const repairState = createState<AgentState>({
        summary: '',
        files: state.data.files,
        previewValidated: false,
      });

      await codeAgent.run(
        `The generated preview failed validation. Fix the application using the available tools. You must call validateApp after the final change and only finish after it returns VALIDATION_OK.\n\nValidation error:\n${previewValidation.error || 'Unknown preview error.'}`,
        { state: repairState, maxIter: 6, step },
      );

      state.data.files = repairState.data.files;
      state.data.summary = repairState.data.summary;
      state.data.previewValidated = repairState.data.previewValidated;

      previewValidation =
        Object.keys(state.data.files || {}).length > 0
          ? await step.run('validate-repaired-app', async () => {
              const sandbox = await getSandbox(sandboxId);
              return validateSandboxPreview(sandbox);
            })
          : noGeneratedFilesValidation();
    }

    const finalFiles = state.data.files || {};
    const finalSummary =
      state.data.summary ||
      '<task_summary>Completed the requested application and verified that its preview renders successfully.</task_summary>';
    const isError =
      !previewValidation.ok || Object.keys(finalFiles).length === 0;

    const sandboxUrl = await step.run('get-sandbox-url', async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    if (isError) {
      const errorContent = previewValidation.error
        ? `Generation failed: ${previewValidation.error.slice(0, 1_000)}`
        : 'Something went wrong. Please try again.';

      await step.run('save-error', async () =>
        prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: errorContent,
            role: 'ASSISTANT',
            type: 'ERROR',
          },
        }),
      );

      return {
        url: sandboxUrl,
        title: 'Generation Error',
        files: finalFiles,
        summary: finalSummary,
        validation: previewValidation,
      };
    }

    const fragmentTitleGenerator = createAgent({
      name: 'fragment-title-generator',
      description: 'A fragment title generator',
      system: FRAGMENT_TITLE_PROMPT,
      model: tokenRouterModel(),
    });

    const responseGenerator = createAgent({
      name: 'response-generator',
      description: 'A response generator',
      system: RESPONSE_PROMPT,
      model: tokenRouterModel(),
    });

    const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(
      finalSummary,
    );

    const { output: responseOutput } = await responseGenerator.run(
      finalSummary,
    );

    await step.run('save-result', async () => {
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: parseAgentOutput(responseOutput),
          role: 'ASSISTANT',
          type: 'RESULT',
          fragment: {
            create: {
              sandboxUrl,
              title: parseAgentOutput(fragmentTitleOutput),
              files: finalFiles,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
      title: 'Fragment',
      files: finalFiles,
      summary: finalSummary,
      validation: previewValidation,
    };
  },
);
