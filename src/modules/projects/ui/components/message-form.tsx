"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, WandSparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { useTRPC } from "@/trpc/client";
import { Usage } from "./usage";

interface MessageFormProps {
  projectId: string;
}

const MessageComposer = ({ projectId }: MessageFormProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const controller = usePromptInputController();
  const { data: usage } = useQuery(trpc.usage.status.queryOptions());

  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId: data.projectId })
        );
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
      },
      onError: (error) => {
        if (error.data?.code === "TOO_MANY_REQUESTS") {
          router.push("/pricing");
        }
        toast.error(error.message);
      },
    })
  );

  const onSubmit = async ({ text }: PromptInputMessage) => {
    const value = text.trim();
    if (!value) return;
    await createMessage.mutateAsync({ value, projectId });
  };

  const isPending = createMessage.isPending;
  const isEmpty = !controller.textInput.value.trim();

  return (
    <div>
      {usage && (
        <Usage
          points={usage.remainingPoints}
          msBeforeNext={usage.msBeforeNext}
        />
      )}
      <PromptInput
        onSubmit={onSubmit}
        className="[&_[data-slot=input-group]]:rounded-xl [&_[data-slot=input-group]]:border-foreground/15 [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-sm dark:[&_[data-slot=input-group]]:border-white/12"
      >
        <PromptInputTextarea
          maxLength={10_000}
          placeholder="Ask CodeGenie to change, add, or refine..."
          className="min-h-20 px-4 pt-4 text-sm leading-6"
        />
        <PromptInputFooter className="px-3 pb-3">
          <PromptInputTools>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              <WandSparklesIcon className="size-3 text-primary" />
              Build instruction
            </span>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={isPending || isEmpty}
            status={isPending ? "submitted" : undefined}
            className="size-8 rounded-md bg-foreground text-background hover:bg-foreground/85"
          >
            {isPending ? undefined : <ArrowUpIcon className="size-3.5" />}
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
};

const MessageForm = ({ projectId }: MessageFormProps) => (
  <PromptInputProvider>
    <MessageComposer projectId={projectId} />
  </PromptInputProvider>
);

export { MessageForm };
