import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET() {
  try {
    const reqHeaders = await headers();
    const userId = reqHeaders.get("x-user-id");
    console.log("id: ", userId);
    const raw = (await redis.hget(`useage:${userId}:messages`, "count")) || 0;

    return NextResponse.json({ content: raw }, { status: 200 });
  } catch (error) {
    console.log("Error: ", error);
    return NextResponse.json(
      { error: "Failed to get user messages remaining" },
      { status: 500 }
    );
  }
}
