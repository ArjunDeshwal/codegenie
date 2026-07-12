"use client";

import { useClerk } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, SparklesIcon } from "lucide-react";
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
import { PROJECT_TEMPLATES } from "@/constants";
import { useTRPC } from "@/trpc/client";

const ProjectComposer = () => {
  const router = useRouter();
  const clerk = useClerk();
  const controller = usePromptInputController();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.push(`/projects/${data.id}`);
      },
      onError: (error) => {
        if (error.data?.code === "UNAUTHORIZED") {
          clerk.openSignIn();
        }
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
    await createProject.mutateAsync({ value });
  };

  const value = controller.textInput.value;
  const isPending = createProject.isPending;

  return (
    <div className="space-y-4">
      <div className="rounded-[1.7rem] border border-white/18 bg-[#101316]/95 p-1.5 shadow-[0_32px_90px_-22px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:rounded-[2rem]">
        <PromptInput
          onSubmit={onSubmit}
          className="[&_[data-slot=input-group]]:rounded-[1.35rem] [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:shadow-none sm:[&_[data-slot=input-group]]:rounded-[1.6rem]"
        >
          <PromptInputTextarea
            autoFocus
            maxLength={10_000}
            rows={5}
            style={{ minHeight: "9.5rem" }}
            placeholder="What should CodeGenie bring to life?"
            className="px-5 pt-5 text-[15px] leading-6 text-white placeholder:text-white/38 sm:px-6 sm:pt-6 sm:text-lg"
          />
          <PromptInputFooter className="px-3 pb-3 sm:px-4 sm:pb-4">
            <PromptInputTools>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/60">
                <SparklesIcon className="size-3 text-[#d8ff62]" />
                Genie mode
              </span>
              <span className="hidden text-xs text-white/35 sm:inline">
                Shift + Enter for a new line
              </span>
            </PromptInputTools>
            <PromptInputSubmit
              status={isPending ? "submitted" : undefined}
              disabled={isPending || !value.trim()}
              className="size-10 rounded-full bg-[#d8ff62] text-[#11150c] hover:bg-[#e4ff91] disabled:bg-white/10 disabled:text-white/30"
            >
              {isPending ? undefined : <ArrowUpIcon className="size-4" />}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {PROJECT_TEMPLATES.map((template) => (
          <button
            key={template.title}
            type="button"
            onClick={() => controller.textInput.setInput(template.prompt)}
            className="group flex min-w-0 items-center gap-2 rounded-full border border-white/12 bg-black/15 px-3 py-2 text-left text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-black/25"
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-xs">
              {template.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-white/75">
                {template.title}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ProjectForm = () => (
  <PromptInputProvider>
    <ProjectComposer />
  </PromptInputProvider>
);

export { ProjectForm };
