"use client";

import { useClerk } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, LoaderCircleIcon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { PROJECT_TEMPLATES } from "@/constants";
import { useTRPC } from "@/trpc/client";

const ProjectForm = () => {
  const [value, setValue] = useState("");
  const router = useRouter();
  const clerk = useClerk();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const createProject = useMutation(trpc.projects.create.mutationOptions({
    onSuccess: (data) => {
      queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
      router.push(`/projects/${data.project.id}`);
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") clerk.openSignIn();
      if (error.data?.code === "TOO_MANY_REQUESTS") router.push("/pricing");
      toast.error(error.message);
    },
  }));

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = value.trim();
    if (!prompt || createProject.isPending) return;
    createProject.mutate({ value: prompt, clientRequestId: crypto.randomUUID() });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-[1.7rem] border border-white/18 bg-[#101316]/95 p-1.5 shadow-[0_32px_90px_-22px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:rounded-[2rem]">
        <div className="rounded-[1.35rem] sm:rounded-[1.6rem]">
          <textarea
            autoFocus
            value={value}
            maxLength={10_000}
            rows={5}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="What should CodeGenie bring to life?"
            className="block min-h-36 w-full resize-none bg-transparent px-5 pt-5 text-[15px] leading-6 text-white outline-none placeholder:text-white/38 sm:px-6 sm:pt-6 sm:text-lg"
          />
          <div className="flex items-center gap-3 px-3 pb-3 sm:px-4 sm:pb-4">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/60">
              <SparklesIcon className="size-3 text-[#d8ff62]" /> Genie mode
            </span>
            <span className="hidden text-xs text-white/35 sm:inline">Shift + Enter for a new line</span>
            <button type="submit" disabled={createProject.isPending || !value.trim()} aria-label="Create project" className="ml-auto flex size-10 items-center justify-center rounded-full bg-[#d8ff62] text-[#11150c] transition-colors hover:bg-[#e4ff91] disabled:bg-white/10 disabled:text-white/30">
              {createProject.isPending ? <LoaderCircleIcon className="size-4 animate-spin" /> : <ArrowUpIcon className="size-4" />}
            </button>
          </div>
        </div>
      </form>
      <div className="flex flex-wrap justify-center gap-2">
        {PROJECT_TEMPLATES.map((template) => (
          <button key={template.title} type="button" onClick={() => setValue(template.prompt)} className="group flex min-w-0 items-center gap-2 rounded-full border border-white/12 bg-black/15 px-3 py-2 text-left text-white backdrop-blur-md transition-colors hover:border-white/30 hover:bg-black/25">
            <span className="flex size-5 shrink-0 items-center justify-center text-xs">{template.emoji}</span>
            <span className="truncate text-[11px] font-medium text-white/75">{template.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export { ProjectForm };
