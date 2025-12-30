import { useEffect, useMemo, useRef } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { MessageRenderer } from "./MessageRenderer";
import { Button } from "@/atoms/button";
import { GitBranch, Paperclip, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";


interface ChatMessagesProps {
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
  allAvailableApiKeys:
  | {
    _id: Id<"userApiKeys">;
    _creationTime: number;
    user_id: string;
    provider: string;
    encryptedApiKey: string;
  }[]
  | undefined;
  streamedMessage: string;
}

export function ChatMessages({
  activeChat,
  activeTab,
  // useage,
  // allAvailableApiKeys,
  streamedMessage,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const branchChat = useMutation(api.chat.branchChat);
  // const regenerateResponse = useMutation(api.messages.regnerateResponse);


  const queryVariables = useMemo(() => {
    return activeChat ? { conversationId: activeChat.id } : "skip";
  }, [activeChat]);

  const messages = useQuery(api.messages.getMessages, queryVariables) || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth", // Change from "smooth" to "auto" to prevent scroll animation conflicts
      block: "end",
    });
  };

  const recentMessage = messages[messages.length - 1];
  const recentMessageLoaded = recentMessage !== undefined && recentMessage.isStreaming === true;


  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, streamedMessage]);


  const onBranchChat = async (message_id: Id<"messages">) => {
    if (!activeChat) return;
    await branchChat({
      title: activeChat.title,
      conversation_id: activeChat.id,
      message_id: message_id,
    });
  };


  const renderedMessagesOptimal = useMemo(
    () =>
      messages.map((msg) => (
        <div key={msg._id} className={cn(`mb-8`, {
          "hidden": msg.isStreaming,
        })}>
          <div className={cn(`flex flex-col group`, {
            'justify-start': msg.message.role === "assistant",
            "items-end": msg.message.role === "user",
          })}>
            <div className={cn(`max-w-[80%] rounded-2xl rounded-br-md px-4 py-3`, {
              'bg-muted': msg.message.role === "assistant",
              'bg-primary text-primary-foreground': msg.message.role === "user"
            })}>
              {msg.isStreaming ? (
                <div className="flex space-x-5 justify-center p-4">
                  <span className="sr-only">Loading...</span>
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
                </div>
              ) : Array.isArray(msg.message.content) ? (
                <>
                  {msg.message.content[0].type === "text" && (
                    <MessageRenderer content={msg.message.content[0].text} />
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
                {msg.message.role === "assistant" && activeTab === "myChats" && (
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
                // onClick={() => regenerateMessage(msg)}
                >
                  <RefreshCcw className="h-3 w-3" />
                </Button>
                <p className="text-xs">{msg.model}</p>
              </div>
            </div>
          </div>
        </div>
      )),
    [messages, recentMessageLoaded, activeTab]
  );

  const streamedOptimal = useMemo(() => (<div className={cn(`flex flex-col group justify-start`, {
  })}>
    <div className={cn(`max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-muted`)}>
      {streamedMessage.length < 1 ? (<div className="flex space-x-5 justify-center p-4">
        <span className="sr-only">Loading...</span>
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
      </div>) : (
        <MessageRenderer content={streamedMessage} />
      )}
    </div>
  </div>), [streamedMessage]);


  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {renderedMessagesOptimal}
        {(recentMessageLoaded) && (streamedOptimal)}
      </div>
    </div>
  );
}
