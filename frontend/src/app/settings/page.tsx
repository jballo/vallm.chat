"use client";

import { Button } from "@/atoms/button";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Settings() {
  const { user } = useUser();
  const router = useRouter();
  return (
    <div className="w-full h-full">
      {/* Header */}
      <div className="flex flex-row w-full">
        <Button onClick={() => router.push("/")}>Back to Chat</Button>
        <h1 className="text-3xl">Settings</h1>
      </div>
      {/* Info */}
      <div className="flex flex-col w-full items-center gap-3">
        {user && (
          <>
            <Image
              width={80}
              height={80}
              src={user.imageUrl}
              alt="User Image"
            />
            <h2 className="text-xl font-bold">{user.fullName}</h2>
            <h3 className="text-lg">{user.emailAddresses[0].emailAddress}</h3>
            <Button>Plan</Button>
          </>
        )}
      </div>
      {/* Plan Benefits */}
      <div className="flex flex-col rounded-2xl">
        <h2>Plan Benefits</h2>
      </div>
    </div>
  );
}
