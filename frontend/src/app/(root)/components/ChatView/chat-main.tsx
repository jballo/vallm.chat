"use client";

import type React from "react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
// import dynamic from "next/dynamic";
import ChatMainHeader from "./Header/chat-main-header";
import MessageInput from "./MessageInput/message-input";
import MessageArea from "./MessageArea/MessageArea";
import { useEffect, useState } from "react";
import { useCompletion } from "@ai-sdk/react";

// const CreditCount = dynamic(() => import("./Header/CreditCount"), {
//   ssr: true,
// });

interface ChatMainProps {
  selectedModel: {
    id: string;
    name: string;
    icon: string;
    provider: string;
    capabilities: string[];
  };
  setSelectedModel: (model: {
    id: string;
    name: string;
    icon: string;
    provider: string;
    capabilities: string[];
  }) => void;
  activeChat: { id: Id<"chats">; title: string } | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activeTab: "myChats" | "shared";
}

export function ChatView({
  selectedModel,
  activeChat,
  setSelectedModel,
  activeTab,
}: ChatMainProps) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [messageLoading, setMessageLoading] = useState<boolean>(false);

  const usage = useQuery(
    api.users.getUsage,
    !user || !isLoaded || !isSignedIn ? "skip" : {}
  );
  const getAllApiKeys = useQuery(
    api.keysMutations.getAllApiKeys,
    !user || !isLoaded || !isSignedIn ? "skip" : {}
  );

  const { completion, complete, stop } = useCompletion({
    api: '/api/messages',
    experimental_throttle: 50,
    onFinish: () => {
      setMessageLoading(false);
      // setTemp("");
    },
    onError: () => {
      setMessageLoading(false);
      // setTemp("");
    },
  });

  const [temp, setTemp] = useState<string>("");

  useEffect(() => {
    setTemp(completion);
  }, [completion]);


  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <ChatMainHeader
        activeTab={activeTab}
        activeChat={activeChat}
        usage={usage}
      />

      {/* Chat messages */}
      <MessageArea
        activeChat={activeChat}
        getAllApiKeys={getAllApiKeys}
        activeTab={activeTab}
        streamedMessage={temp}
      />

      {/* Message input */}
      <MessageInput
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        activeChat={activeChat}
        usage={usage}
        getAllApiKeys={getAllApiKeys}
        messageLoading={messageLoading}
        setMessageLoading={setMessageLoading}
        complete={complete}
        stop={stop}
        setTemp={setTemp}
      />
    </div>
  );
}
