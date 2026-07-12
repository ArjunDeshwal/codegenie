"use client";

import { useAuth } from "@clerk/nextjs";
import {
  CodeIcon,
  CrownIcon,
  EyeIcon,
  MessageSquareIcon,
  MonitorIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { FileExplorer } from "@/components/file-explorer";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserControl } from "@/components/user-control";
import { Fragment } from "@/generated/prisma";
import { useIsMobile } from "@/hooks/use-mobile";
import { FileCollection } from "@/types";
import { FragmentWeb } from "../components/fragment-web";
import { MessagesContainer } from "../components/messages-container";
import { ProjectHeader } from "../components/project-header";

interface ProjectViewProps {
  projectId: string;
}

const EmptyOutput = () => (
  <div className="flex h-full flex-col items-center justify-center bg-muted/25 px-8 text-center">
    <div className="mb-4 flex size-11 items-center justify-center rounded-lg border border-border bg-card text-primary">
      <MonitorIcon className="size-5" />
    </div>
    <p className="text-sm font-medium">Your build will appear here</p>
    <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
      CodeGenie is preparing a runnable preview and its complete file tree.
    </p>
  </div>
);

const Output = ({
  activeFragment,
  tab,
}: {
  activeFragment: Fragment | null;
  tab: "preview" | "code";
}) => {
  if (!activeFragment) return <EmptyOutput />;
  if (tab === "preview") return <FragmentWeb data={activeFragment} />;
  return activeFragment.files ? (
    <FileExplorer files={activeFragment.files as FileCollection} />
  ) : (
    <EmptyOutput />
  );
};

const ProjectView = ({ projectId }: ProjectViewProps) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });
  const isMobile = useIsMobile();
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [outputTab, setOutputTab] = useState<"preview" | "code">("preview");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview" | "code">(
    "chat"
  );

  const messages = (
    <ErrorBoundary fallback={<p className="p-4 text-sm">Unable to load conversation.</p>}>
      <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading conversation…</p>}>
        <MessagesContainer
          projectId={projectId}
          activeFragment={activeFragment}
          setActiveFragment={setActiveFragment}
        />
      </Suspense>
    </ErrorBoundary>
  );

  if (isMobile) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <ProjectHeader projectId={projectId} />
        <Tabs
          value={mobileTab}
          onValueChange={(value) => setMobileTab(value as typeof mobileTab)}
          className="min-h-0 flex-1 gap-0"
        >
          <div className="flex items-center border-b border-border px-2 py-2">
            <TabsList className="h-8 rounded-md bg-muted p-0.5">
              <TabsTrigger value="chat" className="rounded-[5px] text-xs">
                <MessageSquareIcon /> Chat
              </TabsTrigger>
              <TabsTrigger value="preview" className="rounded-[5px] text-xs">
                <EyeIcon /> Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="rounded-[5px] text-xs">
                <CodeIcon /> Code
              </TabsTrigger>
            </TabsList>
            <div className="ml-auto"><UserControl /></div>
          </div>
          <TabsContent value="chat" className="min-h-0">{messages}</TabsContent>
          <TabsContent value="preview" className="min-h-0">
            <Output activeFragment={activeFragment} tab="preview" />
          </TabsContent>
          <TabsContent value="code" className="min-h-0">
            <Output activeFragment={activeFragment} tab="code" />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={34}
          minSize={25}
          maxSize={48}
          className="flex min-h-0 flex-col border-r border-border"
        >
          <ProjectHeader projectId={projectId} />
          {messages}
        </ResizablePanel>

        <ResizableHandle className="w-px bg-transparent transition-colors hover:bg-primary" />

        <ResizablePanel defaultSize={66} minSize={45} className="bg-muted/25">
          <Tabs
            className="h-full gap-0"
            value={outputTab}
            onValueChange={(value) => setOutputTab(value as typeof outputTab)}
          >
            <div className="flex h-[53px] items-center border-b border-border bg-background px-3">
              <div className="mr-4 hidden lg:block">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  Output
                </p>
              </div>
              <TabsList className="h-8 rounded-md bg-muted p-0.5">
                <TabsTrigger value="preview" className="rounded-[5px] text-xs">
                  <EyeIcon /> Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="rounded-[5px] text-xs">
                  <CodeIcon /> Code
                </TabsTrigger>
              </TabsList>

              <div className="ml-auto flex items-center gap-2">
                {activeFragment && (
                  <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground lg:flex">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Build ready
                  </span>
                )}
                {!hasProAccess && (
                  <Button asChild size="xs" variant="outline">
                    <Link href="/pricing">
                      <CrownIcon /> Upgrade
                    </Link>
                  </Button>
                )}
                <UserControl />
              </div>
            </div>

            <TabsContent value="preview" className="min-h-0">
              <Output activeFragment={activeFragment} tab="preview" />
            </TabsContent>
            <TabsContent value="code" className="min-h-0">
              <Output activeFragment={activeFragment} tab="code" />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export { ProjectView };
