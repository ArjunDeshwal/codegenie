import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Fragment } from "@/generated/prisma";
import { DownloadIcon, ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

interface FragmentWebProps {
  data: Fragment & { previewSessions?: Array<{ url: string; expiresAt: Date; status: string }> };
}

const trustedPreviewUrl = (value: string | null | undefined) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname.endsWith(".e2b.dev") || url.hostname.endsWith(".e2b.app"));
  } catch { return false; }
};

const FragmentWeb = ({ data }: FragmentWebProps) => {
  const [fragmentKey, setFragmentKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const trpc = useTRPC();
  const latestSession = data.previewSessions?.[0];
  const initialUrl = latestSession?.url || data.sandboxUrl;
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const initiallyExpired = latestSession ? latestSession.status !== "READY" || latestSession.expiresAt.getTime() <= Date.now() : !initialUrl;
  const [expired, setExpired] = useState(initiallyExpired || !trustedPreviewUrl(initialUrl));
  const restart = useMutation(trpc.previews.restart.mutationOptions({
    onSuccess: (session) => { setPreviewUrl(session.url); setExpired(false); setFragmentKey((value) => value + 1); toast.success("Preview restarted"); },
    onError: (error) => toast.error(error.message),
  }));

  useEffect(() => {
    if (!latestSession || latestSession.status !== "READY") return;
    const remaining = latestSession.expiresAt.getTime() - Date.now();
    if (remaining <= 0) { setExpired(true); return; }
    const timer = window.setTimeout(() => setExpired(true), remaining);
    return () => window.clearTimeout(timer);
  }, [latestSession]);

  const onRefresh = () => {
    setFragmentKey((prev) => prev + 1);
  };

  const handleCopy = () => {
    if (!previewUrl) return;
    navigator.clipboard
      .writeText(previewUrl)
      .then(() => {
        setCopied(true);
        toast.success("Link copied");
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch(() => {
        toast.error("Something went wrong. Please try again.");
      });
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex h-11 items-center gap-2 border-b border-border bg-background px-2.5">
        <Hint text="Click to refresh" side="bottom" align="start">
          <Button size="icon-sm" variant="ghost" onClick={onRefresh}>
            <RefreshCcwIcon />
          </Button>
        </Hint>
        <Hint text="Click to copy" side="bottom">
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 justify-start rounded-md bg-muted/45 text-start font-mono text-[10px] font-normal text-muted-foreground shadow-none"
            disabled={!previewUrl || copied || expired}
            onClick={handleCopy}
          >
            <span className="truncate">{expired ? "Preview expired — restart it" : previewUrl}</span>
          </Button>
        </Hint>
        <Hint text="Open in a new tab" side="bottom" align="start">
          <Button
            size="icon-sm"
            disabled={!previewUrl || expired}
            variant="ghost"
            onClick={() => {
              if (!previewUrl || !trustedPreviewUrl(previewUrl)) {
                return;
              }
              window.open(previewUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLinkIcon />
          </Button>
        </Hint>
        <Hint text="Download source" side="bottom" align="start">
          <Button asChild size="icon-sm" variant="ghost">
            <a href={`/api/fragments/${data.id}/download`} download><DownloadIcon /></a>
          </Button>
        </Hint>
      </div>
      {expired ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/20 px-6 text-center">
          <p className="text-sm font-medium">This temporary preview has expired</p>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            {data.isRestorable ? "Your source is safe. Start a fresh sandbox to view it again." : "This legacy build predates restartable artifacts. Its saved files remain available in the Code tab."}
          </p>
          {data.isRestorable && (
            <Button size="sm" disabled={restart.isPending} onClick={() => restart.mutate({ fragmentId: data.id })}>
              <RefreshCcwIcon /> {restart.isPending ? "Restarting…" : "Restart preview"}
            </Button>
          )}
        </div>
      ) : (
        <iframe
          key={fragmentKey}
          className="h-full w-full"
          sandbox="allow-forms allow-scripts allow-same-origin"
          loading="lazy"
          src={previewUrl || undefined}
          title={`${data.title} preview`}
        />
      )}
    </div>
  );
};

export { FragmentWeb };
