"use client";

import { Textarea } from "@/atoms/textarea";
import { UploadButton } from "@/utils/uploadthing";
import { Ellipsis, LoaderCircle, Paperclip, Send } from "lucide-react";
import Image from "next/image";
import { ModelSelector } from "./model-selector";
import { Button } from "@/atoms/button";
import { useAction, useConvexAuth, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

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
    | {
        _id: Id<"useage">;
        _creationTime: number;
        user_id: string;
        messagesRemaining: number;
      }
    | null
    | undefined;

  messages: {
    _id: Id<"messages">;
    _creationTime: number;
    model?: string | undefined;
    message: {
      role: "system" | "user" | "assistant" | "tool";
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
  }[];

  getAllApiKeys:
    | {
        _id: Id<"userApiKeys">;
        _creationTime: number;
        user_id: string;
        provider: string;
        encryptedApiKey: string;
      }[]
    | undefined;
}

export default function MessageInput({
  selectedModel,
  setSelectedModel,
  activeChat,
  messages,
  useage,
  getAllApiKeys,
}: MessageInputProps) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const sendMessage = useMutation(api.messages.sendMessage);
  const createChat = useAction(api.chat.createChat);
  const uploadImages = useMutation(api.files.uploadImages);

  const handleSendMessage = () => {
    if (!getAllApiKeys) return;
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

    // const encryptedApiKey: string | undefined = getAllApiKeys.find(
    //   (key) => key.provider === selectedModel.provider
    // );

    const encryptedApiKey = getAllApiKeys.find(
      (key) => key.provider === selectedModel.provider
    );

    if (!encryptedApiKey) return;

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
          encryptedApiKey: encryptedApiKey.encryptedApiKey,
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
          encryptedApiKey: encryptedApiKey.encryptedApiKey,
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
          encryptedApiKey: encryptedApiKey.encryptedApiKey,
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
          encryptedApiKey: encryptedApiKey.encryptedApiKey,
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

  return (
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
  );
}
