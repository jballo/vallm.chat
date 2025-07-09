"use client";

import { useState } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMain } from "./chat-main";
import { Id } from "../../../../convex/_generated/dataModel";

interface Model {
  id: string;
  name: string;
  icon: string;
  provider: string;
  capabilities: string[];
}

export function ChatInterface() {
  const [selectedModel, setSelectedModel] = useState<Model>({
    id: "llama-3.1-8b-instant",
    name: "LLama 3.1 8b",
    icon: "llama",
    provider: "Groq",
    capabilities: ["multilingual", "speed"],
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeChat, setActiveChat] = useState<{
    id: Id<"chats">;
    title: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"myChats" | "shared">("myChats");

  return (
    <>
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeChat={activeChat}
        onChatSelect={setActiveChat}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="flex-1 flex flex-col">
        <ChatMain
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          activeChat={activeChat}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={activeTab}
        />
      </div>
    </>
  );
}
