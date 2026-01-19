"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { ChatMessages } from "./messages";
import { Button } from "@/atoms/button";
import { BookOpen, Code, HighlighterIcon, Sparkles } from "lucide-react";
import { Doc, Id } from "../../../../../../convex/_generated/dataModel";

interface MessageAreaProps {
  activeChat: { id: Id<"chats">; title: string } | null;
  useage: Doc<"useage"> | null | undefined;
  getAllApiKeys:
    | {
      _id: Id<"userApiKeys">;
      _creationTime: number;
      userId?: Id<"users"> | undefined;
      provider: string;
      encryptedApiKey: string;
      derivedAt: number;
      }[] 
    | undefined;
  activeTab: "myChats" | "shared";
  streamedMessage: string;
}

export default function MessageArea({
  activeChat,
  useage,
  getAllApiKeys,
  activeTab,
  streamedMessage,
}: MessageAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-card">
      <Authenticated>
        {activeChat ? (
          <ChatMessages
            activeChat={activeChat}
            activeTab={activeTab}
            useage={useage}
            allAvailableApiKeys={getAllApiKeys}
            streamedMessage={streamedMessage}
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
                  <HighlighterIcon className="h-5 w-5" />
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
  );
}
