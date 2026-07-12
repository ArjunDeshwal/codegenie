"use client";

import { PricingTable } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

import { useCurrentTheme } from "@/hooks/use-current-theme";

export default function PricingPage() {
  const currentTheme = useCurrentTheme();

  return (
    <div className="mx-auto w-full max-w-6xl pb-24 pt-32 sm:pt-40">
      <div className="mb-12 grid gap-6 border-b border-border pb-10 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            CodeGenie / Plans
          </p>
          <h1 className="text-5xl font-medium tracking-[-0.05em] sm:text-6xl">
            Build at your
            <span className="block font-serif font-normal italic text-primary">
              own pace.
            </span>
          </h1>
        </div>
        <p className="max-w-lg text-sm leading-6 text-muted-foreground lg:justify-self-end">
          Start with a focused build, then move to Pro when you need more
          generations and room to iterate. Your projects and source remain yours.
        </p>
      </div>

      <PricingTable
        appearance={{
          elements: {
            pricingTableCard: "border! border-border! shadow-none! rounded-xl! bg-card!",
          },
          baseTheme: currentTheme === "dark" ? dark : undefined,
        }}
      />
    </div>
  );
}
