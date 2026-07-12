import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Fragment } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { MessageLoading } from "./message-loading";

interface MessagesContainerProps {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (activeFragment: Fragment | null) => void;
}

const MessagesContainer = ({
  activeFragment,
  projectId,
  setActiveFragment,
}: MessagesContainerProps) => {
  const lastAssistantMessageIdRef = useRef<string | null>(null);
  const trpc = useTRPC();
  const { data: messages } = useQuery(
    trpc.messages.getMany.queryOptions({ projectId }, { refetchInterval: 5000 })
  );

  useEffect(() => {
    const lastAssistantMessage = messages?.findLast(
      (message) => message.role === "ASSISTANT"
    );
    if (
      lastAssistantMessage?.fragment &&
      lastAssistantMessage.id !== lastAssistantMessageIdRef.current
    ) {
      setActiveFragment(lastAssistantMessage.fragment);
      lastAssistantMessageIdRef.current = lastAssistantMessage.id;
    }
  }, [messages, setActiveFragment]);

  const lastMessage = messages?.at(-1);
  const isLastMessageUser = lastMessage?.role === "USER";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <Conversation className="min-h-0">
        <ConversationContent className="gap-6 px-4 py-6">
          {messages?.map((message) => (
            <MessageCard
              key={message.id}
              content={message.content}
              role={message.role}
              fragment={message.fragment}
              createdAt={message.createdAt}
              isActiveFragment={activeFragment?.id === message.fragment?.id}
              onFragmentClick={() => setActiveFragment(message.fragment)}
              type={message.type}
            />
          ))}
          {isLastMessageUser && <MessageLoading />}
        </ConversationContent>
        <ConversationScrollButton className="bottom-2 size-8" />
      </Conversation>

      <div className="relative px-3 pb-3 pt-1">
        <div className="pointer-events-none absolute -top-8 inset-x-0 h-8 bg-gradient-to-b from-transparent to-background" />
        <MessageForm projectId={projectId} />
      </div>
    </div>
  );
};

export { MessagesContainer };
