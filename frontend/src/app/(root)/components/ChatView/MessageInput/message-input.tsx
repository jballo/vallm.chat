"use client";

import { Textarea } from "@/atoms/textarea";
import { UploadButton } from "@/utils/uploadthing";
import { Ellipsis, LoaderCircle, OctagonXIcon, Paperclip, Send } from "lucide-react";
import Image from "next/image";
import { ModelSelector } from "./model-selector";
import { Button } from "@/atoms/button";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { CompletionRequestOptions } from "ai";

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

// interface CoreMessage {
//   role: "system" | "user" | "assistant" | "tool";
//   content: CoreContent;
// }

interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: CoreContent;
}

interface File {
  type: string;
  data: string;
  mimeType: string;
}

interface MessageInputProps {
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
  useage:
    | 
      {
        _id: Id<"useage">;
        _creationTime: number;
        userId?: Id<"users"> | undefined;
        messagesRemaining: number;
      } 
    | null 
    | undefined;
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
  messageLoading: boolean;
  setMessageLoading: (val: boolean) => void;
  complete: (prompt: string, options?: CompletionRequestOptions) => Promise<string | null | undefined>
  stop: () => void;
  setTemp: (str: string) => void;
}

export default function MessageInput({
  selectedModel,
  setSelectedModel,
  activeChat,
  useage,
  getAllApiKeys,
  messageLoading,
  setMessageLoading,
  complete,
  stop,
  setTemp,
}: MessageInputProps) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { isLoading, isAuthenticated } = useConvexAuth();

  const queryVariables = useMemo(() => {
    return activeChat ? { conversationId: activeChat.id } : "skip";
  }, [activeChat]);

  const messages = useQuery(api.messages.getMessages, !user || !isLoaded || !isSignedIn ? "skip" : queryVariables) || [];

  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const uploadImages = useMutation(api.files.uploadImages);
  const saveUserMessage = useMutation(api.messages.saveUserMessage);
  const initateAssistantMessage = useMutation(api.messages.initiateMessage);
  const updateUseage = useMutation(api.users.updateUseage);

  // const { completion, complete } = useCompletion({
  //   api: '/api/completion',
  // });
  // const { messages: chatMessages } = useChat({
  //   api: '/api/messages'
  // });

  // const handleStopStreaming = () => {
  //   console.log("Streaming stopped...");
  //   abortControl.current?.abort();
  //   setMessageLoading(false);
  // }

  const handleSendMessageRoute = async () => {
    if (!user || !isSignedIn || !isLoaded || !getAllApiKeys) return;
    const availableProviders: string[] = getAllApiKeys.map(
      (key) => key.provider
    );

    if (
      !availableProviders.some(
        (provider) => provider === selectedModel.provider
      )
    ) {
      console.log("No provider key provided!");
      toast.error("No API Key!", {
        description: "Please provide the appropriate api key.",
      });
      return;
    }

    if (isLoading || !isAuthenticated) return;

    if (useage === null || useage === undefined || useage.messagesRemaining < 1)
      return;

    const encryptedApiKey = getAllApiKeys.find(
      (key) => key.provider === selectedModel.provider
    );

    if (!encryptedApiKey) return;
    setTemp("");
    setMessageLoading(true);


    let chat_id: Id<"chats"> | null;

    let history;

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

      const msg: ModelMessage = {
        role: "user",
        content: content,
      };
      history = [msg];
    } else {
      const msg: ModelMessage = {
        role: "user",
        content: message,
      };
      history = [msg];
    }

    if (!activeChat) {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          history,
        }),
      });

      if (!response.ok) {
        console.log("Failed to create chat");
        return;
      }

      const result = await response.json();
      chat_id = result.content as Id<"chats">;
      console.log("Chat created...");
    } else {
      chat_id = activeChat.id;
      console.log("Chat selected...");
    }

    const latestMessage: ModelMessage = {
      role: "user",
      content: message,
    }

    await saveUserMessage({
      chatId: chat_id,
      userMessage: latestMessage,
      modelId: selectedModel.id,
    });

    const messageId = await initateAssistantMessage({
      chatId: chat_id,
      modelId: selectedModel.id,
    });

    await updateUseage({
      useageId: useage._id,
      credits: useage.messagesRemaining - 1,
    });

    let newHistory: ModelMessage[] = [];

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

      const msg: ModelMessage = {
        role: "user",
        content: content,
      };

      const oldHistory: ModelMessage[] = [];

      messages.map((m) => {
        if (m.payload) {
          oldHistory.push({
            role: m.payload.role,
            content: m.payload.content,
          });
        }
      });

      newHistory = [...oldHistory, msg];

    } else {
      const msg: ModelMessage = {
        role: "user",
        content: message,
      };

      const oldHistory: ModelMessage[] = [];

      messages.map((m) => {
        if (m.payload) {
          oldHistory.push({
            role: m.payload.role,
            content: m.payload.content,
          });
        }
      });

      newHistory = [...oldHistory, msg];

    }

    try {

      await complete(
        JSON.stringify({
          model: selectedModel.id,
          encryptedApiKey: encryptedApiKey.encryptedApiKey,
          history: newHistory,
          messageId: messageId,
        })
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // This is a user-initiated abort - should be handled as success
        console.log("Request aborted by user");
      } else {
        // This is a system error (network issue, etc.)
        console.error("System error:", error);
        toast.error("Connection Error", {
          description: "Failed to connect to the server. Please check your connection and try again.",
        });
      }
    } finally {
      console.log("Streaming stopped...");
    }

    setMessage("");
    setUploadedFiles([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // handleSendMessage();
      handleSendMessageRoute();
    }
  };

  return (
    <div className="p-6 bg-card">
      {/* <div>
        {completion}
      </div> */}
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
                      key: string;
                    }[] = [];

                    res.map((file) => {
                      filesFormatted.push({
                        name: file.name,
                        url: file.ufsUrl,
                        size: file.size,
                        mimeType: file.type,
                        key: file.key,
                      });
                    });

                    const tempFiles = await uploadImages({
                      files: filesFormatted,
                    });
                    setUploadedFiles((prevFiles) => [...prevFiles, ...tempFiles]);
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
            {messageLoading ? (
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  stop();
                  setMessageLoading(false);
                }}
              >
                <OctagonXIcon className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSendMessageRoute}
                disabled={!message.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>

            )}
          </div>
        </div>
      </div>
    </div>
  );
}
