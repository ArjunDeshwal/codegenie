import { SignedIn } from "@clerk/nextjs";
import { ArrowDownIcon, BlocksIcon, Code2Icon, WandSparklesIcon } from "lucide-react";

import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { ProjectsList } from "@/modules/home/ui/components/projects-list";

const signals = [
  { icon: WandSparklesIcon, label: "Describe the idea" },
  { icon: Code2Icon, label: "Shape the system" },
  { icon: BlocksIcon, label: "Ship real code" },
];

export default function HomePage() {
  return (
    <div id="top" className="w-full">
      <section className="codegenie-hero relative min-h-[100svh] overflow-hidden rounded-b-[2rem] sm:rounded-b-[3rem]">
        <div className="codegenie-aurora" aria-hidden="true">
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
            href="#projects"
            className="mt-auto flex items-center gap-2 pt-12 font-mono text-[9px] uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white"
          >
            Your workshop
            <ArrowDownIcon className="size-3" />
          </a>
        </div>
      </section>

      <SignedIn>
        <div className="mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6">
          <ProjectsList />
        </div>
      </SignedIn>
    </div>
  );
}
