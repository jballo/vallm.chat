import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || ``;

    if (!webhookSecret) {
      throw new Error("No webhook secret provided!");
    }

    const upstash_url = process.env.UPSTASH_REDIS_REST_URL || "";
    const upstash_token = process.env.UPSTASH_REDIS_REST_TOKEN || "";

    if (!upstash_url || !upstash_token) {
      throw new Error("Upstash redis url and token both required");
    }

    const payloadString = await req.text();
    const headerPayload = await headers();

    const svixHeaders = {
      "svix-id": headerPayload.get("svix-id")!,
      "svix-timestamp": headerPayload.get("svix-timestamp")!,
      "svix-signature": headerPayload.get("svix-signature")!,
    };

    // Verify request is from Clerk, if not, an error is thrown
    const wh = new Webhook(webhookSecret);
    wh.verify(payloadString, svixHeaders) as WebhookEvent;

    const body = JSON.parse(payloadString);
    const data = body.data;

    // User info parsed from clerk payload
    const userId = data.id;
    const email = data.email_addresses[0].email_address;

    console.log(`Signing up ${userId}: ${email}`);

    // User is saved in the convex db
    await fetchMutation(api.chat.initateUser, {
      user_id: userId,
      user_email: email,
    });

    return NextResponse.json(
      { content: "User sucessfully added user to db" },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error: ", error);
    return NextResponse.json(
      { content: "Failed to add user to db" },
      { status: 500 }
    );
  }
}
