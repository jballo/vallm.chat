"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Settings,
  Plus,
  Trash,
  LogOut,
  Users,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/atoms/button";
import { Input } from "@/atoms/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/atoms/avatar";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/atoms/tabs";
import clsx from "clsx";
import { Separator } from "@/atoms/separator";
import { useUser } from "@clerk/nextjs";

interface ChatSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeChat: { id: Id<"chats">; title: string } | null;
  onChatSelect: (chatId: { id: Id<"chats">; title: string } | null) => void;
  activeTab: "myChats" | "shared";
  setActiveTab: (tabVal: "myChats" | "shared") => void;
}

interface ChatListProps {
  collapsed: boolean;
  activeChat: { id: Id<"chats">; title: string } | null;
  onChatSelect: (chatId: { id: Id<"chats">; title: string } | null) => void;
  activeTab: "myChats" | "shared";
  setActiveTab: (tabVal: "myChats" | "shared") => void;
}

export function ChatList({
  collapsed,
  activeChat,
  onChatSelect,
  activeTab,
  setActiveTab,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const conversations = useQuery(api.chat.getChats) || [];
  const sharedChats = useQuery(api.sharing.getAcceptedChats) || [];
  const deleteChat = useMutation(api.chat.deleteChat);
  const leaveSharedChat = useMutation(api.sharing.leaveSharedChat);

  useEffect(() => {
    if (activeTab !== "myChats") return;

    if (conversations.length > 0) {
      onChatSelect({
        id: conversations[0]._id,
        title: conversations[0].title,
      });
    } else {
      onChatSelect(null);
    }
  }, [conversations]);

  useEffect(() => {
    console.log("Accepted chats: ", sharedChats);
    if (activeTab !== "shared") return;

    if (sharedChats.length > 0) {
      onChatSelect({
        id: sharedChats[0]._id,
        title: sharedChats[0].title,
      });
    } else {
      onChatSelect(null);
    }
  }, [sharedChats]);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    return conversations?.filter((conversation) =>
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, conversations]);

  const filteredSharedChats = useMemo(() => {
    if (!searchQuery.trim()) return sharedChats;

    return sharedChats?.filter((chat) =>
      chat.title.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())
    );
  }, [searchQuery, sharedChats]);

  // // Group filtered conversations by date
  // const groupedConversations = useMemo(() => {
  //     return filteredConversations?.reduce(
  //         (acc, conversation) => {
  //             if (!acc[conversation.date]) {
  //                 acc[conversation.date] = []
  //             }
  //             acc[conversation.date].push(conversation)
  //             return acc
  //         },
  //         {} as Record<string, typeof conversations>,
  //     )
  // }, [filteredConversations])

  const handleDeleteChat = async (id: Id<"chats">) => {
    await deleteChat({ conversationId: id });
  };

  const handleLeaveChat = async (id: Id<"chats">) => {
    console.log("leaving chat...");
    await leaveSharedChat({
      chat_id: id,
    });
    // onChatSelect(null);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {!collapsed ? (
        <>
          <div className="px-4 pt-4 pb-2">
            <Button
              className="w-full text-white rounded-xl h-11 font-medium transition-colors duration-200"
              onClick={() => onChatSelect(null)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
          <div className="px-4 pt-4 pb-2">
            <Tabs defaultValue="myChats" value={activeTab}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search your threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 transition-colors duration-200"
                />
              </div>
              <TabsList className="mt-2 w-full">
                <TabsTrigger
                  value="myChats"
                  className=""
                  onClick={() => setActiveTab("myChats")}
                >
                  My Chats
                </TabsTrigger>
                <TabsTrigger
                  value="shared"
                  className=""
                  onClick={() => setActiveTab("shared")}
                >
                  Shared
                </TabsTrigger>
              </TabsList>
              <TabsContent value="myChats">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() =>
                      onChatSelect({
                        id: conversation._id,
                        title: conversation.title,
                      })
                    }
                    className={`mb-1 px-3 py-3 rounded-xl cursor-pointer text-sm transition-colors duration-150 hover:bg-[#2a2a2a] hover:text-white relative ${
                      activeChat?.id === conversation._id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground hover:text-white"
                        : ""
                    }`}
                  >
                    {/* {activeChat?.id === conversation._id && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar-border rounded-r-full" />
                                        )} */}
                    <div className="flex flex-row justify-between">
                      <div className="flex flex-col">
                        <div className="font-medium mb-1 line-clamp-1">
                          {conversation.title}
                        </div>
                        <div className="text-xs">
                          {new Date(
                            conversation._creationTime
                          ).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        className={`bg-transparent ${activeChat?.id === conversation._id ? "" : "hidden"}`}
                        onClick={() => handleDeleteChat(conversation._id)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="shared">
                {filteredSharedChats.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() =>
                      onChatSelect({
                        id: conversation._id,
                        title: conversation.title,
                      })
                    }
                    className={`mb-1 px-3 py-3 rounded-xl cursor-pointer text-sm transition-colors duration-150 hover:bg-[#2a2a2a] hover:text-white relative ${
                      activeChat?.id === conversation._id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground hover:text-white"
                        : ""
                    }`}
                  >
                    {/* {activeChat?.id === conversation._id && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8b5cf6] rounded-r-full" />
                                        )} */}
                    <div className="flex flex-row justify-between">
                      <div className="flex flex-col">
                        <div className="font-medium mb-1 line-clamp-1">
                          {conversation.title}
                        </div>
                        <div className="text-xs">
                          {new Date(
                            conversation._creationTime
                          ).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        className={`bg-transparent ${activeChat?.id === conversation._id ? "" : "hidden"}`}
                        onClick={() => handleLeaveChat(conversation._id)}
                      >
                        <LogOut />
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 p-2">
          <Button
            onClick={() => onChatSelect(null)}
            className={clsx(
              `w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold transition-colors duration-150 text-white`
            )}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Separator className="border-[0.5px] border-[#3a3a3a]" />

          <Button
            onClick={() => setActiveTab("myChats")}
            className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold transition-colors duration-150",
              activeTab === "myChats"
                ? "text-white"
                : "bg-[#1e1e1e] text-gray-400 hover:bg-[#2a2a2a] hover:text-white"
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setActiveTab("shared")}
            className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold transition-colors duration-150",
              activeTab === "shared"
                ? "text-white"
                : "bg-[#1e1e1e] text-gray-400 hover:bg-[#2a2a2a] hover:text-white"
            )}
          >
            <Users className="h-4 w-4" />
          </Button>
          <Separator className="border-[0.5px] border-[#3a3a3a]" />

          {activeTab === "myChats" ? (
            <>
              {filteredConversations.slice(0, 8).map((conversation) => (
                <Button
                  key={conversation._id}
                  onClick={() =>
                    onChatSelect({
                      id: conversation._id,
                      title: conversation.title,
                    })
                  }
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold transition-colors duration-150 ${
                    activeChat?.id === conversation._id
                      ? "bg-sidebar-accent hover:bg-[#1e1e1e] text-sidebar-accent-foreground hover:text-white "
                      : "bg-[#1e1e1e] hover:bg-[#1e1e1e] text-gray-400 hover:text-white"
                  }`}
                  title={conversation.title}
                >
                  {conversation.title.slice(0, 2).toUpperCase()}
                </Button>
              ))}
            </>
          ) : (
            <>
              {filteredSharedChats.slice(0, 8).map((conversation) => (
                <Button
                  key={conversation._id}
                  onClick={() =>
                    onChatSelect({
                      id: conversation._id,
                      title: conversation.title,
                    })
                  }
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold transition-colors duration-150 ${
                    activeChat?.id === conversation._id
                      ? "bg-sidebar-accent hover:bg-[#1e1e1e] text-sidebar-accent-foreground hover:text-white "
                      : "bg-[#1e1e1e] hover:bg-[#1e1e1e] text-gray-400 hover:text-white"
                  }`}
                  title={conversation.title}
                >
                  {conversation.title.slice(0, 2).toUpperCase()}
                </Button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatSidebar({
  collapsed,
  onToggleCollapse,
  activeChat,
  onChatSelect,
  activeTab,
  setActiveTab,
}: ChatSidebarProps) {
  const { user } = useUser();
  const router = useRouter();

  const navigateToLogin = () => {
    router.push("/sign-in");
  };

  return (
    <div
      className={`${collapsed ? "w-16" : "w-80"} h-full flex flex-col border-r border-[#2a2a2a] transition-all duration-300 ease-in-out`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div
          className={`flex items-center ${collapsed ? "justify-center" : ""}`}
        >
          <Button
            variant="ghost"
            onClick={onToggleCollapse}
            className="w-8 h-8 mr-3 rounded-lg flex items-center justify-center transition-colors duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 transition-colors"
            >
              <path
                d="M3 12h18M3 6h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Button>
          {!collapsed && (
            <div className="flex items-center">
              <h1 className="text-xl font-bold flex items-center">
                vallm.chat
              </h1>
            </div>
          )}
        </div>
      </div>
      <>
        <>
          <Authenticated>
            <ChatList
              collapsed={collapsed}
              activeChat={activeChat}
              onChatSelect={onChatSelect}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </Authenticated>
          <Unauthenticated>
            <div className="flex flex-col items-center justify-center flex-1 overflow-y-auto">
              <p className="text-white text-sm text-center p-5">
                Sign In To View/Create Chats
              </p>
            </div>
          </Unauthenticated>
        </>
        {!collapsed ? (
          <div className="p-4 border-t border-[#2a2a2a]">
            <div
              className="flex items-center cursor-pointer hover:bg-[#2a2a2a] rounded-xl p-2 transition-colors duration-200 justify-between"
              onClick={() => {
                if (user) {
                  router.push("/settings");
                } else {
                  router.push("/sign-in");
                }
              }}
            >
              <Authenticated>
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="font-bold">User</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex flex-col">
                  <span className="text-sm font-medium">{user?.fullName}</span>
                  <div className="flex items-center">
                    <span className="text-xs text-[#8b5cf6] font-medium">
                      Starter
                    </span>
                    <div className="w-1 h-1 bg-green-500 rounded-full ml-2" />
                  </div>
                </div>
              </Authenticated>
              <Unauthenticated>
                <div className="">Click to Sign In</div>
              </Unauthenticated>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 transition-colors duration-200"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-[#2a2a2a] flex justify-center">
            <Authenticated>
              <Avatar
                className="h-12 w-12 cursor-pointer transition-colors duration-200"
                onClick={navigateToLogin}
              >
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="font-bold">JB</AvatarFallback>
              </Avatar>
            </Authenticated>
            <Unauthenticated>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors duration-200"
                onClick={navigateToLogin}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Unauthenticated>
          </div>
        )}
      </>
    </div>
  );
}
