import { CheckIcon } from "lucide-react";

import { Navbar } from "@/modules/home/ui/components/navbar";

const principles = [
  "Your projects remain tied to your account",
  "Every build includes inspectable source code",
  "Continue refining from one focused workspace",
];

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-14 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <section className="hidden max-w-lg lg:block">
          <p className="mb-7 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            CodeGenie / Private workspace
          </p>
          <h1 className="text-5xl font-medium leading-[1.02] tracking-[-0.05em]">
            Keep the idea.
            <span className="mt-1 block font-serif font-normal italic text-primary">
              Own the implementation.
            </span>
          </h1>
          <div className="mt-10 border-y border-border">
            {principles.map((principle) => (
              <div
                key={principle}
                className="flex items-center gap-3 border-b border-border py-3.5 text-sm last:border-0"
              >
                <CheckIcon className="size-4 text-primary" />
                {principle}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center lg:border-l lg:border-border lg:pl-20">
          {children}
        </section>
      </div>
    </main>
  );
}
