"use client";
import { useState } from "react";
import { ChatSidebar } from "./components/Sidebar/chat-sidebar";
import { Id } from "../../../convex/_generated/dataModel";
import { ChatView } from "./components/ChatView/chat-main";

interface Model {
  id: string;
  name: string;
  icon: string;
  provider: string;
  capabilities: string[];
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<Model>({
    id: "meta-llama/llama-4-scout",
    name: "LLama 4 Scout",
    icon: "llama",
    provider: "OpenRouter",
    capabilities: ["multilingual", "speed"],
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeChat, setActiveChat] = useState<{
    id: Id<"chats">;
    title: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"myChats" | "shared">("myChats");

  return (
    <div className="flex w-full h-screen">
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeChat={activeChat}
        onChatSelect={setActiveChat}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="flex-1 flex flex-col">
        <ChatView
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          activeChat={activeChat}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
