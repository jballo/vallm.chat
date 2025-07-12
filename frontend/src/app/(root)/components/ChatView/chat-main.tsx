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

  const messages =
    useQuery(
      api.messages.getMessages,
      activeChat ? { conversationId: activeChat.id } : "skip"
    ) || [];

  const useage = useQuery(
    api.users.getUsage,
    !user || !isLoaded || !isSignedIn ? "skip" : {}
  );
  const getAllApiKeys = useQuery(
    api.keysMutations.getAllApiKeys,
    !user || !isLoaded || !isSignedIn ? "skip" : {}
  );

  // const branchChat = useMutation(api.chat.branchChat);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <ChatMainHeader
        activeTab={activeTab}
        activeChat={activeChat}
        useage={useage}
      />

      {/* Chat messages */}
      <MessageArea
        activeChat={activeChat}
        messages={messages}
        useage={useage}
        getAllApiKeys={getAllApiKeys}
        activeTab={activeTab}
      />

      {/* Message input */}
      <MessageInput
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        activeChat={activeChat}
        messages={messages}
        useage={useage}
        getAllApiKeys={getAllApiKeys}
      />
    </div>
  );
}
