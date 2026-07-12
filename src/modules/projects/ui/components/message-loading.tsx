"use client";

import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";

const stages = [
  "Reading the product brief",
  "Planning the component structure",
  "Writing and validating the build",
  "Preparing the live preview",
];

const MessageLoading = () => {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStage((stage) => Math.min(stage + 1, stages.length - 1));
    }, 3500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="max-w-full">
      <div className="mb-3 flex items-center gap-2">
        <Image src="/logo.svg" alt="CodeGenie" height={20} width={20} />
        <span className="text-xs font-semibold">CodeGenie</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
          Building
        </span>
      </div>
      <div className="ml-7 rounded-lg border border-border bg-card/50 p-3">
        {stages.map((stage, index) => (
          <div
            key={stage}
            className="flex items-center gap-2.5 py-1.5 text-xs"
          >
            {index < activeStage ? (
              <CheckIcon className="size-3.5 text-primary" />
            ) : index === activeStage ? (
              <Spinner className="size-3.5 text-primary" />
            ) : (
              <span className="mx-0.5 size-2.5 rounded-full border border-border" />
            )}
            <span
              className={
                index <= activeStage ? "text-foreground" : "text-muted-foreground/55"
              }
            >
              {stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { MessageLoading };
