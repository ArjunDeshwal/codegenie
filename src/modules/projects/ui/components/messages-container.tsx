import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { GenerationCard } from "./generation-card";

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
  const hadActiveGenerationRef = useRef(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: messages } = useQuery(trpc.messages.getMany.queryOptions({ projectId }));
  const { data: activeGeneration } = useQuery(
    trpc.generations.getActive.queryOptions(
      { projectId },
      { refetchInterval: (query) => query.state.data ? 2000 : false },
    ),
  );

  useEffect(() => {
    if (activeGeneration) {
      hadActiveGenerationRef.current = true;
      return;
    }
    if (hadActiveGenerationRef.current) {
      hadActiveGenerationRef.current = false;
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId }));
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
      queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
    }
  }, [activeGeneration, projectId, queryClient, trpc]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <Conversation className="min-h-0">
        <ConversationContent className="gap-6 px-4 py-6">
          {messages?.map((message) => (
            <div key={message.id} className="contents">
              <MessageCard
                content={message.content}
                role={message.role}
                fragment={message.fragment}
                createdAt={message.createdAt}
                isActiveFragment={activeFragment?.id === message.fragment?.id}
                onFragmentClick={() => setActiveFragment(message.fragment)}
                type={message.type}
              />
              {message.promptGeneration && message.promptGeneration.id !== activeGeneration?.id && (
                <GenerationCard generation={message.promptGeneration} projectId={projectId} />
              )}
            </div>
          ))}
          {activeGeneration && <GenerationCard generation={activeGeneration} projectId={projectId} />}
        </ConversationContent>
        <ConversationScrollButton className="bottom-2 size-8" />
      </Conversation>

      <div className="relative px-3 pb-3 pt-1">
        <div className="pointer-events-none absolute -top-8 inset-x-0 h-8 bg-gradient-to-b from-transparent to-background" />
        <MessageForm projectId={projectId} disabled={Boolean(activeGeneration)} />
      </div>
    </div>
  );
};

export { MessagesContainer };
