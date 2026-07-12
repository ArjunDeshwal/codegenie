"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRightIcon, BoxIcon, Clock3Icon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

const ProjectsList = () => {
  const { user } = useUser();
  const trpc = useTRPC();
  const { data: projects } = useQuery(trpc.projects.getMany.queryOptions());

  return (
    <section className="pb-24" id="projects">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            Your workspace
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Continue building{user?.firstName ? `, ${user.firstName}` : ""}
          </h2>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-lg bg-card/60">
          <Link href="#top">
            <PlusIcon />
            New project
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!projects &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}

        {projects?.length === 0 && (
          <div className="col-span-full flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/35 px-6 py-12 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BoxIcon className="size-5" />
            </div>
            <p className="text-sm font-medium">Your first build starts above</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a starting point or describe an original idea.
            </p>
          </div>
        )}

        {projects?.map((project, index) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group relative overflow-hidden rounded-xl border border-border bg-card/55 p-5 transition-colors duration-200 hover:border-foreground/30 hover:bg-card"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background font-mono text-xs font-semibold text-primary">
                {String(index + 1).padStart(2, "0")}
              </div>
              <ArrowUpRightIcon className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <h3 className="mt-5 truncate text-sm font-semibold tracking-tight">
              {project.name}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3Icon className="size-3" />
              Updated {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export { ProjectsList };
