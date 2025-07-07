"use client";

import { Button } from "@/atoms/button";
import { Input } from "@/atoms/input";
import { useUser } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { ArrowBigLeft, Check, Moon, Sun, Trash } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Settings() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // const [openRouterKey, setOpenRouterKey] = useState<string>("");
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [groqKey, setGroqKey] = useState<string>("");

  const [providerAvailability, setProviderAvailability] = useState<{
    OpenRouter: boolean;
    Groq: boolean;
    Gemini: boolean;
  }>({
    OpenRouter: false,
    Groq: false,
    Gemini: false,
  });

  const getAllApiKeys = useQuery(
    api.keysMutations.getAllApiKeys,
    !user || !isLoaded || !isSignedIn ? "skip" : {}
  );
  const saveApiKey = useAction(api.keysActions.saveApiKey);
  const delteApiKey = useAction(api.keysActions.deleteApiKey);

  useEffect(() => {
    if (getAllApiKeys) {
      const allAvailableProviders: string[] = getAllApiKeys.map(
        (key) => key.provider
      );

      setProviderAvailability({
        OpenRouter: allAvailableProviders.includes("OpenRouter"),
        Groq: allAvailableProviders.includes("Groq"),
        Gemini: allAvailableProviders.includes("Gemini"),
      });
    }
  }, [getAllApiKeys]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // const onSubmitOpenRouterKey = async () => {
  //   console.log("OpenRouter Key Submitted");
  //   if (openRouterKey.length < 6 || !openRouterKey.startsWith("sk-or-")) {
  //     toast.error("Invalid OpenRouter Key Format!", {
  //       description: "Please provide the appropriate api key.",
  //     });
  //     return;
  //   }
  //   if (!user || !isLoaded || !isSignedIn) return;
  //   const key = openRouterKey;
  //   setOpenRouterKey("");

  //   const result = await saveApiKey({
  //     provider: "OpenRouter",
  //     apiKey: key,
  //   });

  //   console.log("Result: ", result);
  // };

  const onSubmitGeminiKey = async () => {
    console.log("Gemini Key Submitted");
    if (geminiKey.length < 1) {
      toast.error("Invalid Gemini Key Format!", {
        description: "Please provide the appropriate api key.",
      });
      return;
    }
    if (!user || !isLoaded || !isSignedIn) return;
    const key = geminiKey;
    setGeminiKey("");

    const result = await saveApiKey({
      provider: "Gemini",
      apiKey: key,
    });
    console.log("Result: ", result);
  };

  const onSubmitGroqKey = async () => {
    console.log("Groq Key Submitted");
    if (groqKey.length < 4 || !groqKey.startsWith("gsk_")) {
      toast.error("Invalid Groq Key Format!", {
        description: "Please provide the appropriate api key.",
      });
      return;
    }
    if (!user || !isLoaded || !isSignedIn) return;
    const key = groqKey;
    setGroqKey("");

    const result = await saveApiKey({
      provider: "Groq",
      apiKey: key,
    });

    console.log("Result: ", result);
  };

  const deleteKey = async (provider: string) => {
    if (!provider) return;
    if (!user || !isSignedIn || !isLoaded) return;

    const result = await delteApiKey({
      provider: provider,
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
                {/*<div className="flex flex-col gap-0.5">
                  <div className="flex flex-row justify-between pr-12">
                    <h3>OpenRouter API Key</h3>
                    <p>Deeepseek</p>
                  </div>
                  <div className="flex flex-row gap-1 items-center justify-between">
                    {!providerAvailability.OpenRouter ? (
                      <Input
                        type="password"
                        value={openRouterKey}
                        placeholder="sk-or-..."
                        onChange={(e) => setOpenRouterKey(e.target.value)}
                      />
                    ) : (
                      <h3 className="text-md pr-10">Provided...</h3>
                    )}
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: providerAvailability.OpenRouter,
                      })}
                      onClick={onSubmitOpenRouterKey}
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: !providerAvailability.OpenRouter,
                      })}
                      onClick={() => deleteKey("OpenRouter")}
                    >
                      <Trash />
                    </Button>
                  </div>
                </div> */}
                <div className="flex flex-col gap-1">
                  <div className="flex flex-row justify-between pr-12">
                    <h4>Groq API Key</h4>
                    <p>Llama, Mistral, Deepseek</p>
                  </div>
                  <div className="flex flex-row gap-1 items-center justify-between">
                    {!providerAvailability.Groq ? (
                      <Input
                        type="password"
                        value={groqKey}
                        placeholder="gsk_..."
                        onChange={(e) => setGroqKey(e.target.value)}
                      />
                    ) : (
                      <h3 className="text-md pr-10">Provided...</h3>
                    )}
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: providerAvailability.Groq,
                      })}
                      onClick={onSubmitGroqKey}
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: !providerAvailability.Groq,
                      })}
                      onClick={() => deleteKey("Groq")}
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-row justify-between pr-12">
                    <h3>Google AI API Key</h3>
                    <p>Gemini</p>
                  </div>
                  <div className="flex flex-row gap-1 items-center justify-between">
                    {!providerAvailability.Gemini ? (
                      <Input
                        type="password"
                        value={geminiKey}
                        placeholder="..."
                        onChange={(e) => setGeminiKey(e.target.value)}
                      />
                    ) : (
                      <h3 className="text-md pr-10">Provided...</h3>
                    )}
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: providerAvailability.Gemini,
                      })}
                      onClick={onSubmitGeminiKey}
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn("", {
                        hidden: !providerAvailability.Gemini,
                      })}
                      onClick={() => deleteKey("Gemini")}
                    >
                      <Trash />
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
