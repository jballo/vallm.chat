import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

const http = httpRouter();


http.route({
    path: "/clerk-users-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const event = await validateRequest(request);

        if (event === undefined) return new Response ("Error occurred", { status: 400});

        try {
            switch (event.type) {
                case "user.created":
                    const userId: string | undefined = event.data.id;
                    const email: string | undefined = event.data.email_addresses?.[0]?.email_address;
    
                    if ( userId === undefined || email === undefined ) return new Response("Invalid payload", { status: 400 });
    
                    
                    await ctx.runMutation(internal.users.initiateUser, {
                        externalId: userId,
                        email,
                    });
                    break;
                // case "user.updated":
                // case "user.deleted"
                default:
                    console.log("Ignored Clerk webhook event", event.type);
            }
    
            return new Response("Succesful user creation", { status: 200 });


        } catch (error) {

            const convexError = error instanceof ConvexError;

            if (convexError) return new Response("ALREADY EXISTS", { status: 409 })

            return new Response("Error occurred", { status: 500});
        }

    }),
});


async function validateRequest(request: Request): Promise<WebhookEvent | undefined> {
    const payloadString = await request.text();

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if ( svixId === null || svixTimestamp === null || svixSignature === null) {
        return undefined;
    }

    const svixHeaders = {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
    };

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (webhookSecret === undefined) return undefined;

    const wh = new Webhook(webhookSecret);

    try {
        return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
    } catch (error) {
        console.error("Error verifying webhook event", error);
        return undefined;
    }
}

export default http;