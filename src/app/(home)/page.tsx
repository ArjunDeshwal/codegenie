import { SignedIn } from "@clerk/nextjs";
import {
  Browser,
  ChatsCircle,
  ClockCounterClockwise,
  FileCode,
  MagicWand,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  BlocksIcon,
  Code2Icon,
  WandSparklesIcon,
} from "lucide-react";

import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { ProjectsList } from "@/modules/home/ui/components/projects-list";
import { ShaderGradientBackground } from "@/modules/home/ui/components/shader-gradient-background";

const signals = [
  { icon: WandSparklesIcon, label: "Describe the idea" },
  { icon: Code2Icon, label: "Shape the system" },
  { icon: BlocksIcon, label: "Ship real code" },
];

const features = [
  {
    icon: MagicWand,
    iconClass:
      "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
    eyebrow: "01 / Generate",
    title: "Start with the idea, not the setup",
    description:
      "Describe the product in plain English. CodeGenie translates the brief into a thoughtful interface and working application structure.",
  },
  {
    icon: Browser,
    iconClass:
      "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-300",
    eyebrow: "02 / Preview",
    title: "See a real build come alive",
    description:
      "Every generation runs in an isolated cloud sandbox, so you can interact with the product instead of judging a static mockup.",
  },
  {
    icon: FileCode,
    iconClass:
      "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    eyebrow: "03 / Own",
    title: "Keep every line of source",
    description:
      "Explore the complete file tree, inspect the implementation, and carry the code forward without being locked into a visual editor.",
  },
  {
    icon: ChatsCircle,
    iconClass:
      "border-cyan-500/25 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    eyebrow: "04 / Iterate",
    title: "Refine it through conversation",
    description:
      "Ask for a new section, a tighter flow, or a different visual direction. Each follow-up builds on the same product context.",
  },
  {
    icon: ShieldCheck,
    iconClass:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    eyebrow: "05 / Validate",
    title: "Catch broken previews before handoff",
    description:
      "CodeGenie checks that the generated application renders successfully and gives the agent a chance to repair issues automatically.",
  },
  {
    icon: ClockCounterClockwise,
    iconClass:
      "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    eyebrow: "06 / Continue",
    title: "Return to every experiment",
    description:
      "Your projects stay organized as a living workshop, ready for the next prompt whenever inspiration or feedback arrives.",
  },
];

export default function HomePage() {
  return (
    <div id="top" className="w-full">
      <section className="codegenie-hero relative min-h-[100svh] overflow-hidden rounded-b-[2rem] sm:rounded-b-[3rem]">
        <div className="codegenie-aurora" aria-hidden="true">
          <ShaderGradientBackground />
          <div className="codegenie-orbit codegenie-orbit-one" />
          <div className="codegenie-orbit codegenie-orbit-two" />
          <div className="codegenie-grain" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col items-center px-4 pb-8 pt-32 text-center sm:px-6 sm:pb-10 sm:pt-36 lg:pt-40">
          <div className="mb-7 flex items-center gap-2 rounded-full border border-white/12 bg-black/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-[#d8ff62] shadow-[0_0_12px_#d8ff62]" />
            AI product workshop
          </div>

          <h1 className="max-w-5xl text-balance text-[3.25rem] font-medium leading-[0.9] tracking-[-0.065em] text-[#f7f5ef] sm:text-7xl lg:text-[6.8rem]">
            Wish it.
            <span className="block font-serif font-normal italic tracking-[-0.04em] text-[#d8ff62]">
              Ship it.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-balance text-base leading-7 text-white/68 sm:text-lg">
            CodeGenie turns a plain-English idea into a working product you can
            preview, edit, and truly own.
          </p>

          <div className="mt-11 w-full max-w-4xl text-left sm:mt-14">
            <ProjectForm />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-white/60">
            {signals.map(({ icon: Icon, label }, index) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="size-3.5 text-[#d8ff62]" />
                <span>{label}</span>
                {index < signals.length - 1 && (
                  <span className="ml-4 hidden text-white/25 sm:inline">/</span>
                )}
              </div>
            ))}
          </div>

          <a
            href="#features"
            className="mt-auto flex items-center gap-2 pt-12 font-mono text-[9px] uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white"
          >
            Explore the system
            <ArrowDownIcon className="size-3" />
          </a>
        </div>
      </section>

      <section id="features" className="relative px-4 py-24 sm:px-6 sm:py-32">
        <div className="editorial-rule pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-7xl -translate-x-1/2 opacity-45" />
        <div className="relative mx-auto w-full max-w-6xl">
          <div className="grid gap-10 border-b border-border pb-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                A complete build loop
              </p>
              <h2 className="mt-5 max-w-xl text-balance text-4xl font-medium leading-[0.98] tracking-[-0.05em] sm:text-6xl">
                From first thought to
                <span className="block font-serif font-normal italic text-primary">
                  working software.
                </span>
              </h2>
            </div>
            <div className="lg:pb-1">
              <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                CodeGenie keeps product thinking, implementation, validation,
                and iteration in one focused workspace—so momentum survives the
                distance between an idea and usable code.
              </p>
              <a
                href="#top"
                className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                Start building
                <ArrowRightIcon className="size-4" />
              </a>
            </div>
          </div>

          <div className="grid border-x border-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map(
              ({ icon: Icon, iconClass, eyebrow, title, description }) => (
                <article
                  key={title}
                  className="group min-h-72 border-b border-border bg-background/82 p-7 transition-colors hover:bg-card sm:p-8 lg:[&:nth-child(3n+2)]:border-x"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      {eyebrow}
                    </span>
                    <span
                      className={`flex size-12 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:-translate-y-0.5 ${iconClass}`}
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-7"
                        weight="duotone"
                      />
                    </span>
                  </div>
                  <h3 className="mt-12 max-w-xs text-xl font-medium tracking-[-0.025em]">
                    {title}
                  </h3>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <SignedIn>
        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6">
          <ProjectsList />
        </div>
      </SignedIn>
    </div>
  );
}
