import { useEffect, useMemo, useRef } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { MessageRenderer } from "./MessageRenderer";
import { Button } from "@/atoms/button";
import { GitBranch, Paperclip, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// interface CoreTextPart {
//   type: "text";
//   text: string;
// }

// interface CoreImagePart {
//   type: "image";
//   image: string; // either a URL or a base64 string
//   mimeType?: string;
// }

// interface CoreFilePart {
//   type: "file";
//   data: string; // either a URL or base64 string
//   mimeType: string;
// }

// type CoreContent = string | Array<CoreTextPart | CoreImagePart | CoreFilePart>;

// interface CoreMessage {
//   role: "system" | "user" | "assistant" | "tool";
//   content: CoreContent;
// }

// interface QueryMessage {
//   _id: Id<"messages">;
//   _creationTime: number;
//   model?: string | undefined;
//   message: {
//     role: "user" | "system" | "assistant" | "tool";
//     content:
//     | string
//     | (
//       | {
//         text: string;
//         type: "text";
//       }
//       | {
//         mimeType?: string | undefined;
//         image: string;
//         type: "image";
//       }
//       | {
//         type: "file";
//         mimeType: string;
//         data: string;
//       }
//     )[];
//   };
//   author_id: string;
//   chat_id: Id<"chats">;
//   isComplete: boolean;
// }

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
  messageLoading: boolean;
  streamedMessage: string;
}

export function ChatMessages({
  activeChat,
  activeTab,
  // useage,
  // allAvailableApiKeys,
  messageLoading,
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

  // const regenerateMessage = async (msg: QueryMessage) => {
  //   if (useage === null || useage === undefined) return;
  //   if (!allAvailableApiKeys) return;
  //   const selectedProvider =
  //     msg.model === "gemini-2.0-flash" ? "Gemini" : "Groq";

  //   const encryptedApiKey = allAvailableApiKeys.find(
  //     (key) => key.provider == selectedProvider
  //   );

  //   if (encryptedApiKey === undefined) return;

  //   console.log("msg: ", msg);
  //   console.log("msg role: ", msg.message.role);

  //   const targetIndex = messages.findIndex(
  //     (tempMsg) => tempMsg._id === msg._id
  //   );
  //   if (targetIndex === -1) return;

  //   console.log("index of message: ", targetIndex);

  //   const messagesToDelete =
  //     msg.message.role === "user"
  //       ? messages.slice(targetIndex, messages.length)
  //       : messages.slice(targetIndex - 1, messages.length);

  //   const messageIdsToDelete: Id<"messages">[] =
  //     msg.message.role === "user"
  //       ? messages.slice(targetIndex, messages.length).map((m) => m._id)
  //       : messages.slice(targetIndex - 1, messages.length).map((m) => m._id);
  //   // const messageIdsToDelete: Id<"messages">[] = messages.slice(targetIndex, messages.length).map(m => m._id);

  //   const history: CoreMessage[] =
  //     msg.message.role === "user"
  //       ? messages.slice(0, targetIndex + 1).map((m) => ({
  //         role: m.message.role,
  //         content: m.message.content,
  //       }))
  //       : messages.slice(0, targetIndex).map((m) => ({
  //         role: m.message.role,
  //         content: m.message.content,
  //       }));

  //   const conversation_id = msg.chat_id;

  //   const model = msg.model;

  //   console.log("messagesToDelete: ", messagesToDelete);
  //   console.log("history: ", history);
  //   console.log("messageIdsToDelete: ", messageIdsToDelete);
  //   console.log("conversation_id: ", conversation_id);
  //   console.log("model: ", model);

  //   await regenerateResponse({
  //     conversationId: conversation_id,
  //     history: history,
  //     model: model || "",
  //     messageIdsToDelete: messageIdsToDelete,
  //     useageId: useage._id,
  //     credits: useage.messagesRemaining,
  //     encryptedApiKey: encryptedApiKey.encryptedApiKey,
  //   });
  // };

  const renderedMessagesOptimal = useMemo(
    () =>
      messages.map((msg) => (
        <div key={msg._id} className={cn(`mb-8`, {
          "hidden": msg.isComplete === false,
        })}>
          <div className={cn(`flex flex-col group`, {
            'justify-start': msg.message.role === "assistant",
            "items-end": msg.message.role === "user",
          })}>
            <div className={cn(`max-w-[80%] rounded-2xl rounded-br-md px-4 py-3`, {
              'bg-muted': msg.message.role === "assistant",
              'bg-primary text-primary-foreground': msg.message.role === "user"
            })}>
              {Array.isArray(msg.message.content) ? (
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
              ) : msg.message.content.length === 0 ? (
                <div className="flex space-x-5 justify-center p-4">
                  <span className="sr-only">Loading...</span>
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
                </div>
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
    [messages, messageLoading, activeTab]
  );

  // const streamedOptimal = useMemo(() => (<div className={cn(`flex flex-col group justify-start`, {
  // })}>
  //   <div className={cn(`max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-green-200`)}>
  //     {streamedMessage.length < 1 ? (<div className="flex space-x-5 justify-center p-4">
  //       <span className="sr-only">Loading...</span>
  //       <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
  //       <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
  //       <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
  //     </div>) : (
  //       <MessageRenderer content={streamedMessage} />
  //     )}
  //   </div>
  // </div>), [streamedMessage]);

  const streamedContent = (
    <div className={cn("flex flex-col group justify-start")}>
      <div className={cn("max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-muted")}>
        {streamedMessage.length < 1 ? (
          <div className="flex space-x-5 justify-center p-4">
            <span className="sr-only">Loading...</span>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
          </div>
        ) : (
          <MessageRenderer content={streamedMessage} />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {renderedMessagesOptimal}
        {/* {streamedMessage && streamedMessage.length > 0 && (streamedOptimal)} */}
        {(streamedMessage.length > 0 && messages.at(-1)?.isComplete === false) && (streamedContent)}
        {/* <div ref={messagesEndRef} /> */}
      </div>
    </div>
  );
}
