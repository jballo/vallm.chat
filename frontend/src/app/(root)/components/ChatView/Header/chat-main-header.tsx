"use client";

import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import CreditCount from "./CreditCount";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/atoms/dialog";
import { Button } from "@/atoms/button";
import {
  Bell,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Share,
  Sun,
  XIcon,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Input } from "@/atoms/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/atoms/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/atoms/popover";
import { Card, CardContent, CardFooter, CardHeader } from "@/atoms/card";
import { InvitationList } from "./invitation-list";
import { SignInButton, SignOutButton } from "@clerk/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Id } from "../../../../../../convex/_generated/dataModel";

interface ChatMainHeaderProps {
  activeTab: "myChats" | "shared";
  activeChat: { id: Id<"chats">; title: string } | null;
  usage:
    | 
      {
        _id: Id<"usage">;
        _creationTime: number;
        messagesRemaining: number;
        userId: Id<"users">;
      } 
    | null 
    | undefined
}

export default function ChatMainHeader({
  activeTab,
  activeChat,
  usage,
}: ChatMainHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState<string>("");
  const createInvitation = useMutation(api.sharing.createInvitation);

  const shareChat = async () => {
    if (!email || email.length < 1) return;

    if (!activeChat) return;

    await createInvitation({
      chatId: activeChat.id,
      chatName: activeChat.title,
      recipientEmail: email, 
    });
    setEmail("");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-lg">
          {activeChat ? activeChat.title : "Chat"}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <Authenticated>
          <CreditCount usage={usage} />
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
  );
}
