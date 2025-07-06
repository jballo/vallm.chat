"use client";

import { Button } from "@/atoms/button";
import { Input } from "@/atoms/input";
import { useUser } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { ArrowBigLeft, Check, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [openRouterKey, setOpenRouterKey] = useState<string>("");
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [groqKey, setGroqKey] = useState<string>("");
  const [openRouterKeyViewable, setOpenRouterKeyViewable] =
    useState<boolean>(false);
  const [geminiKeyViewable, setGeminiKeyViewable] = useState<boolean>(false);
  const [groqKeyViewable, setGroqKeyViewable] = useState<boolean>(false);

  const getAllApiKeys = useQuery(
    api.keysMutations.getAllApiKeys,
    !user || !isLoaded || !isSignedIn ? "skip" : {}
  );
  const saveApiKey = useAction(api.keysActions.saveApiKey);
  const simpleDecryptKey = useAction(api.keysActions.simpleDecryptKey);

  console.log("api keys: ", getAllApiKeys);

  useEffect(() => {
    if (getAllApiKeys) {
      getAllApiKeys.map(async (key) => {
        if (key.provider === "OpenRouter") {
          const decryptedKey = await simpleDecryptKey({
            encryptedApiKey: key.encryptedApiKey,
          });
          setOpenRouterKey(decryptedKey.apiKey);
        } else if (key.provider === "Gemini") {
          const decryptedKey = await simpleDecryptKey({
            encryptedApiKey: key.encryptedApiKey,
          });
          setGeminiKey(decryptedKey.apiKey);
        } else if (key.provider == "Groq") {
          const decryptedKey = await simpleDecryptKey({
            encryptedApiKey: key.encryptedApiKey,
          });
          setGroqKey(decryptedKey.apiKey);
        }
      });
    }
  }, [getAllApiKeys]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const onToggleOpenRouterKeyViewable = () => {
    setOpenRouterKeyViewable((prev) => !prev);
  };

  const onToggleGeminiKeyViewable = () => {
    setGeminiKeyViewable((prev) => !prev);
  };

  const onToggleGroqKeyViewable = () => {
    setGroqKeyViewable((prev) => !prev);
  };

  const onSubmitOpenRouterKey = async () => {
    console.log("OpenRouter Key Submitted");
    if (openRouterKey.length < 1) return;
    if (!user || !isLoaded || !isSignedIn) return;
    const result = await saveApiKey({
      provider: "OpenRouter",
      apiKey: openRouterKey,
    });

    console.log("Result: ", result);
  };

  const onSubmitGeminiKey = async () => {
    console.log("Gemini Key Submitted");
    if (geminiKey.length < 1) return;
    if (!user || !isLoaded || !isSignedIn) return;
    const result = await saveApiKey({
      provider: "Gemini",
      apiKey: geminiKey,
    });
    console.log("Result: ", result);
  };

  const onSubmitGroqKey = async () => {
    console.log("Groq Key Submitted");
    if (groqKey.length < 1) return;
    if (!user || !isLoaded || !isSignedIn) return;

    const result = await saveApiKey({
      provider: "Groq",
      apiKey: groqKey,
    });

    console.log("Result: ", result);
  };

  return (
    <div className="w-full h-full">
      {/* Header */}
      <div className="flex flex-row w-full justify-between p-6">
        <Button onClick={() => router.push("/")}>
          <ArrowBigLeft />
        </Button>
        <h1 className="text-3xl font-bold">Settings</h1>
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
      {/* Body */}
      <div className="flex flex-col h-full w-full gap-5">
        {/* Info */}
        <div className="flex flex-col w-full items-center gap-5">
          {user && (
            <>
              <Image
                width={80}
                height={80}
                src={user.imageUrl}
                alt="User Image"
                className="rounded-xl"
              />
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                <h3 className="text-lg">
                  {user.emailAddresses[0].emailAddress}
                </h3>
              </div>
              <Button>Free Plan</Button>
            </>
          )}
        </div>
        {/* Plan Benefits */}
        <div className="flex flex-col items-center w-full">
          <div className="flex flex-col w-5/12 rounded-xl bg-muted p-8">
            <h2 className="text-lg font-bold">Plan Benefits</h2>
            <ul className="list-disc pl-5 marker:text-primary text-lg">
              <li>Inital Free 50 Messages</li>
              <li>Access to all AI models*</li>
              <li>Bring Your Own Key to Access Appropriate Model</li>
            </ul>
          </div>
        </div>
        {/* API Keys */}
        <div className="flex flex-col w-full items-center">
          <div className="flex flex-col w-5/12 rounded-xl bg-muted">
            <div className="flex flex-col w-full p-8 pr-3 gap-2.5">
              <h2 className="text-lg font-bold">API Keys</h2>
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-row justify-between pr-12">
                    <h3>OpenRouter API Key</h3>
                    <p>Deeepseek</p>
                  </div>
                  <div className="flex flex-row gap-1">
                    <Input
                      type={openRouterKeyViewable ? "text" : "password"}
                      value={openRouterKey}
                      onChange={(e) => setOpenRouterKey(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: !openRouterKeyViewable,
                      })}
                      onClick={onSubmitOpenRouterKey}
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={onToggleOpenRouterKeyViewable}
                    >
                      {openRouterKeyViewable ? <Eye /> : <EyeOff />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-row justify-between pr-12">
                    <h3>Google AI API Key</h3>
                    <p>Gemini</p>
                  </div>
                  <div className="flex flex-row gap-1">
                    <Input
                      type={geminiKeyViewable ? "text" : "password"}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: !geminiKeyViewable,
                      })}
                      onClick={onSubmitGeminiKey}
                    >
                      <Check />
                    </Button>
                    <Button variant="ghost" onClick={onToggleGeminiKeyViewable}>
                      {geminiKeyViewable ? <Eye /> : <EyeOff />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-row justify-between pr-12">
                    <h4>Groq API Key</h4>
                    <p>Llama, Mistral</p>
                  </div>
                  <div className="flex flex-row gap-1">
                    <Input
                      type={groqKeyViewable ? "text" : "password"}
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: !groqKeyViewable,
                      })}
                      onClick={onSubmitGroqKey}
                    >
                      <Check />
                    </Button>
                    <Button variant="ghost" onClick={onToggleGroqKeyViewable}>
                      {groqKeyViewable ? <Eye /> : <EyeOff />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
