"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, LoaderCircleIcon, WandSparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { ReferenceUrlChip } from "@/components/reference-url-chip";
import { extractReferenceUrl, removeReferenceUrl } from "@/lib/reference-url";
import { Usage } from "./usage";

interface MessageFormProps { projectId: string; disabled?: boolean }

const MessageForm = ({ projectId, disabled }: MessageFormProps) => {
  const [value, setValue] = useState("");
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: usage } = useQuery(trpc.usage.status.queryOptions());
  const inspectionAvailable = process.env.NEXT_PUBLIC_WEBSITE_INSPECTION_ENABLED !== "false";
  let referenceUrl: string | null = null;
  try { referenceUrl = inspectionAvailable ? extractReferenceUrl(value) : null; } catch { referenceUrl = null; }
  const createMessage = useMutation(trpc.messages.create.mutationOptions({
    onSuccess: () => {
      setValue("");
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.generations.getActive.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
    },
    onError: (error) => {
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.generations.getActive.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
      if (error.data?.code === "TOO_MANY_REQUESTS") router.push("/pricing");
      toast.error(error.message);
    },
  }));
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = value.trim();
    if (!prompt || disabled || createMessage.isPending) return;
    createMessage.mutate({ value: prompt, referenceUrl, projectId, clientRequestId: crypto.randomUUID() });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
  };

  return (
    <div>
      {usage && (
        <Usage
          points={usage.remainingPoints}
          msBeforeNext={usage.msBeforeNext}
          isUnlimited={usage.isUnlimited}
        />
      )}
      <form onSubmit={submit} className="overflow-hidden rounded-xl border border-foreground/15 bg-card shadow-sm dark:border-white/12">
        <textarea
          value={value}
          disabled={disabled}
          maxLength={10_000}
          rows={3}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled ? "A build is already running…" : "Ask CodeGenie to change, add, or refine..."}
          className="block min-h-20 w-full resize-none bg-transparent px-4 pt-4 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
        />
        {referenceUrl && (
          <div className="px-3 pb-2">
            <ReferenceUrlChip url={referenceUrl} onRemove={() => setValue(removeReferenceUrl(value))} />
          </div>
        )}
        <div className="flex items-center px-3 pb-3">
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"><WandSparklesIcon className="size-3 text-primary" /> Build instruction</span>
          <button type="submit" disabled={disabled || createMessage.isPending || !value.trim()} aria-label="Submit build instruction" className="ml-auto flex size-8 items-center justify-center rounded-md bg-foreground text-background transition-colors hover:bg-foreground/85 disabled:opacity-40">
            {createMessage.isPending ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <ArrowUpIcon className="size-3.5" />}
          </button>
        </div>
      </form>
    </div>
  );
};

export { MessageForm };
