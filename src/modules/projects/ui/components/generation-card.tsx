"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BanIcon, CircleAlertIcon, Globe2Icon, LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type {
  Generation,
  WebsiteInspectionStatus,
  WebsiteQualityStatus,
} from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";

const stageLabels: Record<Generation["stage"], string> = {
  QUEUED: "Waiting for a worker",
  PREPARING: "Preparing a secure workspace",
  INSPECTING: "Inspecting the reference website",
  RESTORING: "Restoring your previous build",
  GENERATING: "Building the interface",
  VALIDATING: "Checking the preview",
  COMPARING: "Comparing with the reference",
  REPAIRING: "Repairing the generated app",
  SAVING: "Saving your files",
};

interface InspectionSummary {
  seedUrl: string;
  canonicalOrigin: string | null;
  status: WebsiteInspectionStatus;
  pageCount: number;
  pageRoutes: string[];
  failureMessage: string | null;
  qualityStatus: WebsiteQualityStatus;
  qualityScore: number | null;
  qualityReport: unknown;
  qualityRepairUsed: boolean;
}

type GenerationWithInspection = Generation & {
  websiteInspection?: InspectionSummary | null;
};

const qualityLabel = (inspection: InspectionSummary) => {
  if (inspection.qualityStatus === "UNAVAILABLE") return "Alignment unavailable";
  if (inspection.qualityStatus === "PENDING") return null;
  if ((inspection.qualityScore || 0) >= 80) return "High reference alignment";
  if ((inspection.qualityScore || 0) >= 60) return "Medium reference alignment";
  return "Needs refinement";
};

const ReferenceSummary = ({ inspection }: { inspection: InspectionSummary }) => {
  let hostname = "Reference website";
  try { hostname = new URL(inspection.canonicalOrigin || inspection.seedUrl).hostname; } catch { /* Keep the safe fallback. */ }
  const alignment = qualityLabel(inspection);
  const report = inspection.qualityReport && typeof inspection.qualityReport === "object"
    ? inspection.qualityReport as { differences?: unknown }
    : null;
  const differences = Array.isArray(report?.differences)
    ? report.differences.filter((value): value is string => typeof value === "string").slice(0, 2)
    : [];
  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2.5 text-xs">
      <div className="flex items-center gap-2 font-medium">
        <Globe2Icon className="size-3.5 text-primary" />
        <span className="min-w-0 truncate">{hostname}</span>
        <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {inspection.status === "PENDING" ? "Inspecting" : `${inspection.pageCount} page${inspection.pageCount === 1 ? "" : "s"}`}
        </span>
      </div>
      {inspection.status === "PARTIAL" && <p className="mt-1.5 text-muted-foreground">Some linked pages could not be inspected.</p>}
      {inspection.status === "FAILED" && <p className="mt-1.5 text-muted-foreground">{inspection.failureMessage || "Reference inspection failed."}</p>}
      {inspection.pageRoutes.length > 0 && <p className="mt-1.5 truncate text-muted-foreground">{inspection.pageRoutes.join(" · ")}</p>}
      {alignment && <p className="mt-1.5 text-muted-foreground">{alignment}{inspection.qualityRepairUsed ? " · repaired once" : ""}</p>}
      {differences.map((difference) => <p key={difference} className="mt-1 text-muted-foreground">{difference}</p>)}
    </div>
  );
};

export function GenerationCard({ generation, projectId }: { generation: GenerationWithInspection; projectId: string }) {
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
  if (generation.status === "SUCCEEDED") {
    return generation.websiteInspection ? (
      <div className="ml-7"><ReferenceSummary inspection={generation.websiteInspection} /></div>
    ) : null;
  }

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
      {generation.websiteInspection && <ReferenceSummary inspection={generation.websiteInspection} />}
    </div>
  );
}
