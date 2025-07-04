"use client";

import { Button } from "@/atoms/button";
import { Input } from "@/atoms/input";
import { useUser } from "@clerk/nextjs";
import { ArrowBigLeft, Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Settings() {
  const { user } = useUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <div className="w-full h-full">
      {/* Header */}
      <div className="flex flex-row w-full justify-between p-6">
        <Button onClick={() => router.push("/")}>
          <ArrowBigLeft />
        </Button>
        <h1 className="text-3xl">Settings</h1>
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
        <div className="flex flex-col items-center w-full text-primary-foreground">
          <div className="flex flex-col w-5/12 rounded-xl bg-secondary-foreground p-8">
            <h2 className="text-lg font-bold">Plan Benefits</h2>
            <ul className="list-disc pl-5 marker:text-primary text-lg">
              <li>Inital Free 50 Messages</li>
              <li>Access to all AI models*</li>
              <li>Bring Your Own Key to Access Appropriate Model</li>
            </ul>
          </div>
        </div>
        {/* API Keys */}
        <div className="flex flex-col w-full items-center text-primary-foreground">
          <div className="flex flex-col w-5/12 rounded-xl bg-secondary-foreground">
            <div className="flex flex-col w-full p-8 pr-3 gap-2.5">
              <h2 className="text-lg font-bold">API Keys</h2>
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <h3>OpenAI API Key</h3>
                  <div className="flex flex-row gap-1">
                    <Input type="text" />
                    <Button variant="ghost">
                      <Check />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3>Google AI API Key</h3>
                  <div className="flex flex-row gap-1">
                    <Input type="text" />
                    <Button variant="ghost">
                      <Check />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <h4>Groq API Key</h4>
                  <div className="flex flex-row gap-1">
                    <Input type="text" />
                    <Button variant="ghost">
                      <Check />
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
