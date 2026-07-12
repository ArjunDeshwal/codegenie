import { ArrowRightIcon, CheckIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    description: "A simple way to try CodeGenie and ship your first idea.",
    price: "$0",
    cadence: "forever",
    features: [
      "1 full app generation every 30 days",
      "Live sandbox preview",
      "Complete generated source code",
    ],
    action: "Start building",
    href: "/",
    featured: false,
  },
  {
    name: "Pro",
    description: "For builders who want room to explore, refine, and ship.",
    price: "Coming soon",
    cadence: "billing is being prepared",
    features: [
      "100 app generations every 30 days",
      "Fast iterative editing",
      "Live previews and complete source",
    ],
    action: "Continue with Free",
    href: "/",
    featured: true,
  },
] as const;

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
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
          Start with a focused build, then move to Pro when you need more room
          to iterate. Your projects and generated source remain yours.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`relative flex min-h-[390px] flex-col overflow-hidden rounded-2xl border p-7 sm:p-9 ${
              plan.featured
                ? "border-primary/40 bg-primary/[0.06]"
                : "border-border bg-card"
            }`}
          >
            {plan.featured && (
              <div className="absolute right-0 top-0 flex items-center gap-1.5 border-b border-l border-primary/25 bg-primary/10 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-primary">
                <SparklesIcon className="size-3" /> For frequent builders
              </div>
            )}

            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {plan.name}
            </p>
            <div className="mt-6">
              <span className="text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
                {plan.price}
              </span>
              <p className="mt-2 text-xs text-muted-foreground">
                {plan.cadence}
              </p>
            </div>
            <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">
              {plan.description}
            </p>

            <ul className="mt-8 space-y-3 border-t border-border/70 pt-7">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              asChild
              variant={plan.featured ? "default" : "outline"}
              className="mt-auto h-11 justify-between rounded-lg px-4"
            >
              <Link href={plan.href}>
                {plan.action} <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </article>
        ))}
      </div>

      <p className="mt-7 text-center text-xs text-muted-foreground">
        Pro checkout will open after production billing is configured.
      </p>
    </div>
  );
}
