"use client";

import { Globe2Icon, XIcon } from "lucide-react";

export function ReferenceUrlChip({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] text-primary">
      <Globe2Icon className="size-3 shrink-0" />
      <span className="truncate">Inspect {new URL(url).hostname} · up to 3 pages</span>
      <button type="button" onClick={onRemove} aria-label="Remove website reference" className="rounded-full p-0.5 hover:bg-primary/15">
        <XIcon className="size-3" />
      </button>
    </span>
  );
}
