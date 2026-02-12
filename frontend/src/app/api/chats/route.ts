import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { auth } from "@clerk/nextjs/server";
import { ModelMessage, generateText } from "ai";
import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { fetchMutation } from "convex/nextjs";
import { getAuthToken } from "@/app/auth";

export async function POST(req: Request) {
  try {
    await auth.protect();

    const token = await getAuthToken();
    if (!token) throw new Error("Failed to authenticate with jwt");

    const body = await req.json();
    console.log("Body: ", body);

    const { user_id, history } = body;

    if (!user_id) throw new Error("No user id provided!");

    const google = createGoogleGenerativeAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: process.env.GEMINI_KEY,
    });

    const { text } = await generateText({
      model: google("gemini-2.0-flash-lite"),
      system:
        "Generate a four word title that describes the message the user will provide. NO LONGER THAN FOUR WORDS",
      messages: history as ModelMessage[],
    });

    console.log("Title: ", text);

    const chat_id = await fetchMutation(
      api.chat.hybridSaveChat,
      {
        title: text,
      },
      { token }
    );

    // await fetchMutation(api.users.updateUseage, {
    //   useageId,
    //   credits: credits - 1,
    // });

    // const latestMessage = history[history.length - 1];
    // await fetchMutation(api.messages.saveUserMessage, {
    //   chat_id,
    //   userMessage: latestMessage,
    //   model: model,
    // });

    // const messageId = await fetchMutation(api.messages.initiateMessage, {
    //   chat_id,
    //   model,
    // });

    return NextResponse.json({ content: chat_id }, { status: 200 });
  } catch (error) {
    console.log("Failed Chat Creation: ", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
