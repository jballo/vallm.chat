"use client";

import type React from "react";
import {
  HighlighterIcon as HighlightIcon,
  Code,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/atoms/button";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
// import dynamic from "next/dynamic";
import { ChatMessages } from "./messages";
import ChatMainHeader from "./Header/chat-main-header";
import MessageInput from "./MessageInput/message-input";

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
      <div className="flex-1 overflow-y-auto bg-card">
        <Authenticated>
          {activeChat ? (
            <ChatMessages
              messages={messages}
              activeChat={activeChat}
              activeTab={activeTab}
              useage={useage}
              allAvailableApiKeys={getAllApiKeys}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-[#2a2a2a] text-gray-500 rounded-2xl rounded-bl-md px-4 py-3">
                      Send a message to start a new conversation...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Authenticated>
        <Unauthenticated>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
                <Button
                  variant="outline"
                  className="flex items-center justify-start gap-3 h-16 rounded-2xl transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Create</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-start gap-3 h-16 rounded-2xl transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <HighlightIcon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Explore</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-start gap-3 h-16 rounded-2xl transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <Code className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Code</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-start gap-3 h-16 rounded-2xl transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Learn</span>
                </Button>
              </div>
            </div>
          </div>
        </Unauthenticated>
      </div>

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
