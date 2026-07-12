"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentTheme } from "@/hooks/use-current-theme";
import { useTRPC } from "@/trpc/client";

interface ProjectHeaderProps {
  projectId: string;
}

const ProjectHeader = ({ projectId }: ProjectHeaderProps) => {
  const trpc = useTRPC();
  const { data: project } = useQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );
  const { setTheme } = useTheme();
  const currentTheme = useCurrentTheme();

  return (
    <header className="flex h-[53px] shrink-0 items-center border-b border-border bg-background px-2.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="min-w-0 justify-start px-1.5 hover:bg-muted"
          >
            <Image src="/logo.svg" alt="CodeGenie" height={22} width={22} />
            <span className="min-w-0 truncate text-xs font-semibold">
              {project?.name ?? "Loading project"}
            </span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" className="w-52">
          <DropdownMenuItem asChild>
            <Link href="/">
              <ChevronLeftIcon /> Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
          >
            {currentTheme === "dark" ? <SunIcon /> : <MoonIcon />}
            {currentTheme === "dark" ? "Light appearance" : "Dark appearance"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="ml-auto hidden font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
        Conversation
      </span>
    </header>
  );
};

export { ProjectHeader };
