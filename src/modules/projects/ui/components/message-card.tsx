import { format } from "date-fns";
import { ArrowUpRightIcon, Code2Icon } from "lucide-react";
import Image from "next/image";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Fragment, MessageRole, MessageType } from "@/generated/prisma";
import { cn } from "@/lib/utils";

interface MessageCardProps {
  content: string;
  role: MessageRole;
  fragment: Fragment | null;
  createdAt: Date;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
}

const FragmentCard = ({
  fragment,
  isActiveFragment,
  onFragmentClick,
}: {
  fragment: Fragment;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
}) => (
  <button
    type="button"
    onClick={() => onFragmentClick(fragment)}
    className={cn(
      "group/fragment mt-2 flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:border-foreground/25",
      isActiveFragment && "border-primary/40 bg-accent/45"
    )}
  >
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
      <Code2Icon className="size-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-xs font-medium">{fragment.title}</span>
      <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        Generated build
      </span>
    </span>
    <ArrowUpRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover/fragment:-translate-y-0.5 group-hover/fragment:translate-x-0.5" />
  </button>
);

const MessageCard = ({
  content,
  createdAt,
  fragment,
  isActiveFragment,
  onFragmentClick,
  role,
  type,
}: MessageCardProps) => {
  if (role === "USER") {
    return (
      <Message from="user" className="max-w-[88%]">
        <MessageContent className="rounded-xl bg-foreground px-4 py-3 text-background dark:bg-foreground dark:text-background">
          <p className="whitespace-pre-wrap text-sm leading-6">{content}</p>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message
      from="assistant"
      className={cn("max-w-full", type === "ERROR" && "text-destructive")}
    >
      <div className="mb-1 flex items-center gap-2">
        <Image src="/logo.svg" alt="CodeGenie" height={20} width={20} />
        <span className="text-xs font-semibold">CodeGenie</span>
        <span className="font-mono text-[9px] text-muted-foreground">
          {format(createdAt, "HH:mm")}
        </span>
      </div>
      <MessageContent className="w-full pl-7 text-sm leading-6">
        <MessageResponse>{content}</MessageResponse>
        {fragment && type === "RESULT" && (
          <FragmentCard
            fragment={fragment}
            isActiveFragment={isActiveFragment}
            onFragmentClick={onFragmentClick}
          />
        )}
      </MessageContent>
    </Message>
  );
};

export { MessageCard };
