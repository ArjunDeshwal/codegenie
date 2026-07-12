"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowUpRightIcon, MoonIcon, PlusIcon, SunIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { useCurrentTheme } from "@/hooks/use-current-theme";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const scrolled = useScroll();
  const currentTheme = useCurrentTheme();
  const { setTheme } = useTheme();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 w-full border-b border-transparent text-white transition-all duration-300",
        scrolled &&
          "border-white/10 bg-[#0d1014]/80 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="CodeGenie"
            width={30}
            height={30}
            className="transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"
          />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            CodeGenie
          </span>
          <span className="hidden border-l border-white/15 pl-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/50 sm:inline-flex">
            Make it real
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/pricing"
            className="hidden rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/8 hover:text-white sm:inline-flex"
          >
            Pricing
          </Link>
          <Button
            aria-label="Toggle theme"
            variant="ghost"
            size="icon-sm"
            className="text-white/65 hover:bg-white/8 hover:text-white"
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
          >
            {currentTheme === "dark" ? <SunIcon /> : <MoonIcon />}
          </Button>

          <SignedOut>
            <div className="ml-1 flex items-center gap-2">
              <SignInButton>
                <Button variant="ghost" size="sm" className="hidden text-white hover:bg-white/8 hover:text-white sm:flex">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button size="sm" className="rounded-full bg-[#d8ff62] px-4 text-[#11150c] shadow-none hover:bg-[#e4ff91]">
                  Start building
                  <ArrowUpRightIcon />
                </Button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="ml-1 flex items-center gap-2">
              <Button asChild size="sm" className="hidden rounded-full bg-white/10 text-white hover:bg-white/16 sm:flex">
                <Link href="/">
                  <PlusIcon />
                  New build
                </Link>
              </Button>
              <UserControl />
            </div>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};

export { Navbar };
