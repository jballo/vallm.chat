"use client";

import type React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Paperclip,
  HighlighterIcon as HighlightIcon,
  Code,
  BookOpen,
  Sparkles,
  Send,
  Ellipsis,
  LoaderCircle,
  Share,
  Mail,
  XIcon,
  Bell,
  Check,
  GitBranch,
  LogOut,
  LogIn,
  RefreshCcw,
  SquarePen,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/atoms/button";
import { Input } from "@/atoms/input";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Authenticated,
  Unauthenticated,
  useAction,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ModelSelector } from "./model-selector";
import { MessageRenderer } from "./MessageRenderer";
import { UploadButton } from "@/utils/uploadthing";
import Image from "next/image";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/atoms/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/atoms/tabs";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/atoms/popover";
import { Card, CardContent, CardFooter, CardHeader } from "@/atoms/card";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { Textarea } from "@/atoms/textarea";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

const CreditCount = dynamic(() => import("./CreditCount"), {
  ssr: true,
});

interface CoreTextPart {
  type: "text";
  text: string;
}

interface CoreImagePart {
  type: "image";
  image: string; // either a URL or a base64 string
  mimeType?: string;
}

interface CoreFilePart {
  type: "file";
  data: string; // either a URL or base64 string
  mimeType: string;
}

type CoreContent = string | Array<CoreTextPart | CoreImagePart | CoreFilePart>;

interface CoreMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: CoreContent;
}

interface QueryMessage {
  _id: Id<"messages">;
  _creationTime: number;
  model?: string | undefined;
  message: {
    role: "user" | "system" | "assistant" | "tool";
    content:
      | string
      | (
          | {
              text: string;
              type: "text";
            }
          | {
              mimeType?: string | undefined;
              image: string;
              type: "image";
            }
          | {
              type: "file";
              mimeType: string;
              data: string;
            }
        )[];
  };
  author_id: string;
  chat_id: Id<"chats">;
  isComplete: boolean;
}

interface ChatMainProps {
  selectedModel: {
    id: string;
    name: string;
    icon: string;
    capabilities: string[];
  };
  setSelectedModel: (model: {
    id: string;
    name: string;
    icon: string;
    capabilities: string[];
  }) => void;
  activeChat: { id: Id<"chats">; title: string } | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activeTab: "myChats" | "shared";
}

interface ChatMessagesProps {
  messages: QueryMessage[];
  activeChat: { id: Id<"chats">; title: string } | null;
  activeTab: "myChats" | "shared";
  useage:
    | {
        _id: Id<"useage">;
        _creationTime: number;
        user_id: string;
        messagesRemaining: number;
      }
    | null
    | undefined;
}

export function ChatMessages({
  messages,
  activeChat,
  activeTab,
  useage,
}: ChatMessagesProps) {
  // Memoize the messages rendering
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const branchChat = useMutation(api.chat.branchChat);
  const regenerateResponse = useMutation(api.messages.regnerateResponse);

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth", // Change from "smooth" to "auto" to prevent scroll animation conflicts
      block: "end",
    });
  };

  const onBranchChat = async (message_id: Id<"messages">) => {
    if (!activeChat) return;
    await branchChat({
      title: activeChat.title,
      conversation_id: activeChat.id,
      message_id: message_id,
    });
  };

  const regenerateMessage = async (msg: QueryMessage) => {
    if (useage === null || useage === undefined) return;
    console.log("msg: ", msg);
    console.log("msg role: ", msg.message.role);

    const targetIndex = messages.findIndex(
      (tempMsg) => tempMsg._id === msg._id
    );
    if (targetIndex === -1) return;

    console.log("index of message: ", targetIndex);

    const messagesToDelete =
      msg.message.role === "user"
        ? messages.slice(targetIndex, messages.length)
        : messages.slice(targetIndex - 1, messages.length);

    const messageIdsToDelete: Id<"messages">[] =
      msg.message.role === "user"
        ? messages.slice(targetIndex, messages.length).map((m) => m._id)
        : messages.slice(targetIndex - 1, messages.length).map((m) => m._id);
    // const messageIdsToDelete: Id<"messages">[] = messages.slice(targetIndex, messages.length).map(m => m._id);

    const history: CoreMessage[] =
      msg.message.role === "user"
        ? messages.slice(0, targetIndex + 1).map((m) => ({
            role: m.message.role,
            content: m.message.content,
          }))
        : messages.slice(0, targetIndex).map((m) => ({
            role: m.message.role,
            content: m.message.content,
          }));

    const conversation_id = msg.chat_id;

    const model = msg.model;

    console.log("messagesToDelete: ", messagesToDelete);
    console.log("history: ", history);
    console.log("messageIdsToDelete: ", messageIdsToDelete);
    console.log("conversation_id: ", conversation_id);
    console.log("model: ", model);

    await regenerateResponse({
      conversationId: conversation_id,
      history: history,
      model: model || "",
      messageIdsToDelete: messageIdsToDelete,
      useageId: useage._id,
      credits: useage.messagesRemaining,
    });
  };

  // Memoize the messages rendering
  const renderedMessages = useMemo(
    () =>
      messages.map((msg) => (
        <div key={msg._id} className="mb-8">
          {msg.message.role === "assistant" ? (
            <div className="flex flex-col justify-start group">
              <div className="max-w-[80%] bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                {Array.isArray(msg.message.content) ? (
                  msg.message.content[0].type === "text" ? (
                    <MessageRenderer content={msg.message.content[0].text} />
                  ) : (
                    ""
                  )
                ) : (
                  <MessageRenderer content={msg.message.content} />
                )}
              </div>
              <div className="flex flex-row gap-2 p-2 items-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-row items-center gap-2">
                  {activeTab === "myChats" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-xl transition-colors duration-200"
                      onClick={() => onBranchChat(msg._id)}
                    >
                      <GitBranch className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-xl transition-colors duration-200"
                    onClick={() => regenerateMessage(msg)}
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </Button>
                  <p className="text-xs">{msg.model}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-end group">
              <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                {Array.isArray(msg.message.content) ? (
                  <>
                    {msg.message.content[0].type === "text" ? (
                      <MessageRenderer content={msg.message.content[0].text} />
                    ) : (
                      ""
                    )}
                    <div className="flex flex-row gap-2 mt-2">
                      {msg.message.content.slice(1).map((item, index) => {
                        if (item.type === "image") {
                          return (
                            <Image
                              key={index}
                              alt="Uploaded image"
                              src={item.image || ""}
                              width={70}
                              height={50}
                              className="rounded-xl border border-[#3a3340] object-cover"
                            />
                          );
                        } else if (item.type === "file") {
                          return (
                            <div
                              key={index}
                              className="flex flex-row items-center w-[165px] h-[50px] overflow-hidden text-xs text-white p-3 rounded-xl border border-[#3a3340] gap-1"
                            >
                              <Paperclip className="h-4 w-4" />{" "}
                              {item.data?.split("/").pop()}
                            </div>
                          );
                        }
                      })}
                    </div>
                  </>
                ) : (
                  <MessageRenderer content={msg.message.content} />
                )}
              </div>
              <div className="flex flex-row gap-2 p-2 items-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-row items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-xl transition-colors duration-200"
                    onClick={() => regenerateMessage(msg)}
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-9 w-9 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-xl transition-colors duration-200"
                  >
                    <SquarePen className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )),
    [messages]
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {renderedMessages}
        <div ref={messagesEndRef} />
        {/* Add this empty div as a scroll anchor */}
      </div>
    </div>
  );
}

export function InvitationList() {
  const pendingInvitations = useQuery(api.sharing.getPendingInvitations);
  const acceptInvite = useMutation(api.sharing.acceptInvitation);
  const denyInvite = useMutation(api.sharing.denyInvitation);

  return (
    <>
      {pendingInvitations && pendingInvitations.length > 0 ? (
        pendingInvitations.map((invitation) => (
          <div
            key={invitation._id}
            className="flex flex-col gap-2 p-3 border border-[#2a2a2a] rounded-xl mb-2"
          >
            <p className="text-base font-bold">{invitation.chat_name}</p>
            <p className="text-sm">{invitation.author_email} shared a chat.</p>
            <div className="flex flex-row items-center justify-between">
              <p className="text-sm">
                {new Date(invitation._creationTime).toLocaleDateString()}
              </p>
              <div className="flex flex-row gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => denyInvite({ invitation_id: invitation._id })}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
                <Button
                  className="rounded-xl px-3 py-1 text-sm"
                  onClick={() =>
                    acceptInvite({ invitation_id: invitation._id })
                  }
                >
                  <Check className="h-4 w-4 mr-1" /> Accept
                </Button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="flex flex-col gap-2 p-3 border border-[#2a2a2a] rounded-xl mb-2">
          No Invitations
        </div>
      )}
    </>
  );
}

interface File {
  type: string;
  data: string;
  mimeType: string;
}

export function ChatMain({
  selectedModel,
  activeChat,
  setSelectedModel,
  activeTab,
}: ChatMainProps) {
  const { theme, setTheme } = useTheme();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [email, setEmail] = useState<string>("");
  const { user, isLoaded, isSignedIn } = useUser();

  const messages =
    useQuery(
      api.messages.getMessages,
      activeChat ? { conversationId: activeChat.id } : "skip"
    ) || [];

  // console.log("messages: ", messages);
  const sendMessage = useMutation(api.messages.sendMessage);
  const createChat = useAction(api.chat.createChat);
  const uploadImages = useMutation(api.files.uploadImages);
  const createInvitation = useMutation(api.sharing.createInvitation);
  const useage = useQuery(
    api.users.getUsage,
    !user || !isLoaded || !isSignedIn ? "skip" : {}
  );

  // const branchChat = useMutation(api.chat.branchChat);

  const handleSendMessage = () => {
    if (isLoading || !isAuthenticated) return;

    if (useage === null || useage === undefined || useage.messagesRemaining < 1)
      return;

    if (!activeChat) {
      if (uploadedFiles.length > 0) {
        const userMsg: CoreTextPart = {
          type: "text",
          text: message,
        };
        const tempFiles: (CoreImagePart | CoreFilePart)[] = [];

        uploadedFiles.map((file) => {
          if (file.mimeType === "application/pdf") {
            const tempFile: CoreFilePart = {
              type: "file",
              data: file.data,
              mimeType: file.mimeType,
            };
            tempFiles.push(tempFile);
          } else {
            const tempImg: CoreImagePart = {
              type: "image",
              image: file.data,
              mimeType: file.mimeType,
            };
            tempFiles.push(tempImg);
          }
        });

        const content: CoreContent = [userMsg, ...tempFiles];

        const msg: CoreMessage = {
          role: "user",
          content: content,
        };
        createChat({
          history: [msg],
          model: selectedModel.id,
          useageId: useage._id,
          credits: useage.messagesRemaining,
        });
      } else {
        const msg: CoreMessage = {
          role: "user",
          content: message,
        };

        createChat({
          history: [msg],
          model: selectedModel.id,
          useageId: useage._id,
          credits: useage.messagesRemaining,
        });
      }
    } else {
      if (uploadedFiles.length > 0) {
        const userMsg: CoreTextPart = {
          type: "text",
          text: message,
        };
        const tempFiles: (CoreImagePart | CoreFilePart)[] = [];

        uploadedFiles.map((file) => {
          if (file.mimeType === "application/pdf") {
            const tempFile: CoreFilePart = {
              type: "file",
              data: file.data,
              mimeType: file.mimeType,
            };
            tempFiles.push(tempFile);
          } else {
            const tempImg: CoreImagePart = {
              type: "image",
              image: file.data,
              mimeType: file.mimeType,
            };
            tempFiles.push(tempImg);
          }
        });

        const content: CoreContent = [userMsg, ...tempFiles];

        const msg: CoreMessage = {
          role: "user",
          content: content,
        };

        const oldHistory: CoreMessage[] = [];

        messages.map((m) => {
          if (m.message) {
            oldHistory.push({
              role: m.message.role,
              content: m.message.content,
            });
          }
        });

        const newHistory: CoreMessage[] = [...oldHistory, msg];

        sendMessage({
          conversationId: activeChat.id,
          history: newHistory,
          model: selectedModel.id,
          useageId: useage._id,
          credits: useage.messagesRemaining,
        });
      } else {
        const msg: CoreMessage = {
          role: "user",
          content: message,
        };

        const oldHistory: CoreMessage[] = [];

        messages.map((m) => {
          if (m.message) {
            oldHistory.push({
              role: m.message.role,
              content: m.message.content,
            });
          }
        });

        const newHistory: CoreMessage[] = [...oldHistory, msg];

        // createChat({
        //   history: [msg],
        //   model: selectedModel.id,
        // });

        sendMessage({
          conversationId: activeChat.id,
          history: newHistory,
          model: selectedModel.id,
          useageId: useage._id,
          credits: useage.messagesRemaining,
        });
      }
    }

    setMessage("");
    setUploadedFiles([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const shareChat = async () => {
    if (!email || email.length < 1) return;

    if (!activeChat) return;

    await createInvitation({
      recipient_email: email,
      chat_id: activeChat.id,
      chat_name: activeChat.title,
    });
    setEmail("");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // const onBranchChat = async () => {
  //   if (!activeChat) return;
  //   await branchChat({
  //     title: activeChat.title,
  //     conversation_id: activeChat.id,
  //   })
  // }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg">
            {activeChat ? activeChat.title : "Chat"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Authenticated>
            <CreditCount useage={useage} />
            {activeChat && activeTab === "myChats" && (
              <>
                {/* <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-xl transition-colors duration-200"
                  onClick={onBranchChat}
                >
                  <GitBranch className="h-5 w-5" />
                </Button> */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl transition-colors duration-200"
                    >
                      <Share className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border rounded-2xl p-6 shadow-lg gap-4">
                    <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm hover:opacity-75">
                      <XIcon className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                    <DialogHeader>
                      <DialogTitle className="font-semibold">
                        Share {activeChat?.title}
                      </DialogTitle>
                      <DialogDescription className="">
                        Share your chat with other users on the platform. Enter
                        their email.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-8">
                      <div className="flex flex-row items-center gap-3">
                        <label className="">
                          <Mail className="h-8" />
                        </label>
                        <Input
                          type="email"
                          className="border rounded-md h-8"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-row items-end justify-between">
                        <Tabs defaultValue="edit">
                          <TabsList className="border rounded-xl p-1">
                            <TabsTrigger
                              value="edit"
                              className="px-4 py-2 rounded-md transition-colors duration-200"
                            >
                              Edit
                            </TabsTrigger>
                            <TabsTrigger
                              value="view"
                              className="px-4 py-2 rounded-md transition-colors duration-200"
                            >
                              View
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="edit" className="mt-2">
                            Let another user add additions to this chat.
                            <br />
                            <strong>IMPORTANT</strong>: User must already be
                            signed up.
                          </TabsContent>
                          <TabsContent value="view" className="mt-2">
                            Coming soon...
                          </TabsContent>
                        </Tabs>
                        <DialogClose asChild>
                          <Button
                            className="rounded-xl transition-colors duration-200"
                            onClick={shareChat}
                          >
                            Submit
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl transition-colors duration-200"
                >
                  <Bell className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="border-none p-0 w-80">
                <Card className="border-[1px]">
                  <CardHeader className="text-lg font-semibold">
                    Chat Invitations
                  </CardHeader>
                  <CardContent>
                    <Authenticated>
                      <InvitationList />
                    </Authenticated>
                    <Unauthenticated>
                      <p>Sign In to view invitations</p>
                    </Unauthenticated>
                  </CardContent>
                  <CardFooter className="hidden">View All</CardFooter>
                </Card>
              </PopoverContent>
            </Popover>
            <SignOutButton>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl transition-colors duration-200"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </SignOutButton>
          </Authenticated>
          <Unauthenticated>
            <SignInButton>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl transition-colors duration-200"
              >
                <LogIn className="h-5 w-5" />
              </Button>
            </SignInButton>
          </Unauthenticated>
          <Button
            variant="ghost"
            className="p-0 text-md w-6 h-6 flex"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Sun className="text-yellow-200" />
            ) : (
              <Moon className="text-violet-600" />
            )}
          </Button>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto bg-card">
        <Authenticated>
          {activeChat ? (
            <ChatMessages
              messages={messages}
              activeChat={activeChat}
              activeTab={activeTab}
              useage={useage}
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
      <div className="p-6 bg-card">
        <div className="flex flex-col  gap-3 max-w-4xl mx-auto">
          <div className="flex flex-row w-full gap-4">
            {uploadedFiles.map((file, index) => {
              if (file.type === "application/pdf") {
                return (
                  <div
                    key={index}
                    className="flex flex-row items-center w-[165px] h-[50px] overflow-hidden text-xs text-white p-3 rounded-xl border-1 border-[#3a3340] gap-1"
                  >
                    <Paperclip className="h-4 w-4" /> {file.type}
                  </div>
                );
              } else {
                return (
                  <Image
                    key={index}
                    alt={file.mimeType}
                    src={file.data}
                    width={70} // 70 pixels
                    height={50} // 50 pixels
                    className="rounded-xl border-1 border-[#3a3340]"
                  />
                );
              }
            })}
          </div>
          <div className="relative">
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="pr-32 pl-6 py-3 border-[#3a3a3a] rounded-2xl focus:border-[#3a1a2f] focus:ring-2 focus:ring-[#3a1a2f]/25 transition-colors duration-200 text-base"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {(selectedModel.capabilities.includes("image") ||
                selectedModel.capabilities.includes("pdf")) && (
                <UploadButton
                  endpoint="imageUploader"
                  className="ut-button:h-9 ut-button:w-9 ut-button:bg-transparent ut-allowed-content:hidden"
                  content={{
                    button({ ready }) {
                      if (ready)
                        return <Paperclip className="w-4 h-4 text-[#99a1af]" />;

                      return <Ellipsis className="w-4 h-4 text-[#99a1af]" />;
                    },
                    allowedContent({ ready, isUploading }) {
                      if (!ready)
                        return <Ellipsis className="w-4 h-4 text-[#99a1af]" />;
                      if (isUploading)
                        return (
                          <LoaderCircle className="w-4 h-4 text-[#99a1af]" />
                        );
                      return "";
                    },
                  }}
                  onClientUploadComplete={async (res) => {
                    // Do something with the response
                    console.log("Files: ", res);
                    const filesFormatted: {
                      name: string;
                      url: string;
                      size: number;
                      mimeType: string;
                    }[] = [];

                    res.map((file) => {
                      filesFormatted.push({
                        name: file.name,
                        url: file.ufsUrl,
                        size: file.size,
                        mimeType: file.type,
                      });
                    });

                    const tempFiles = await uploadImages({
                      files: filesFormatted,
                    });
                    setUploadedFiles((prevFiles) => [
                      ...prevFiles,
                      ...tempFiles,
                    ]);
                    // alert("Upload Completed");
                  }}
                  onUploadError={(error: Error) => {
                    // Do something with the error.
                    alert(`ERROR! ${error.message}`);
                  }}
                />
              )}
              <ModelSelector
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSendMessage}
                disabled={!message.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
