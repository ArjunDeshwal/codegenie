"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BanIcon, CircleAlertIcon, LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Generation } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";

const stageLabels: Record<Generation["stage"], string> = {
  QUEUED: "Waiting for a worker",
  PREPARING: "Preparing a secure workspace",
  RESTORING: "Restoring your previous build",
  GENERATING: "Building the interface",
  VALIDATING: "Checking the preview",
  REPAIRING: "Repairing the generated app",
  SAVING: "Saving your files",
};

export function GenerationCard({ generation, projectId }: { generation: Generation; projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const cancel = useMutation(trpc.generations.cancel.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.generations.getActive.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
    },
    onError: (error) => toast.error(error.message),
  }));
  const retry = useMutation(trpc.generations.retry.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.generations.getActive.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
    },
    onError: (error) => toast.error(error.message),
  }));

  const active = ["QUEUED", "RUNNING", "CANCEL_REQUESTED"].includes(generation.status);
  if (generation.status === "SUCCEEDED") return null;

  return (
    <div className="ml-7 rounded-xl border border-border bg-card p-3.5 text-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {active ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <CircleAlertIcon className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {generation.status === "CANCEL_REQUESTED" ? "Cancelling build" : active ? stageLabels[generation.stage] : generation.status === "CANCELLED" ? "Build cancelled" : "Build failed"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {active ? "You can leave this page; progress is saved." : generation.failureMessage || "The build did not finish. Your credit was refunded."}
          </p>
          {!active && generation.failureCode && (
            <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {generation.failureCode} · {generation.id.slice(0, 8)}
            </p>
          )}
        </div>
        {active ? (
          <Button size="xs" variant="outline" disabled={cancel.isPending || generation.status === "CANCEL_REQUESTED"} onClick={() => cancel.mutate({ generationId: generation.id })}>
            <BanIcon /> Cancel
          </Button>
        ) : (
          <Button size="xs" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate({ generationId: generation.id, clientRequestId: crypto.randomUUID() })}>
            <RotateCcwIcon /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}
