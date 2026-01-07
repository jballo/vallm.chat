import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { internal } from "./_generated/api";

const http = httpRouter();


http.route({
    path: "/clerk-users-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const event = await validateRequest(request);

        if (event === undefined) return new Response ("Error occured", { status: 400});

        try {
            switch (event.type) {
                case "user.created":
                    const userId: string | undefined = event.data.id;
                    const email: string | undefined = event.data.email_addresses?.[0]?.email_address;
    
                    if ( userId === undefined || email === undefined ) return new Response("Invalid payload", { status: 400 });
    
                    
                    await ctx.runMutation(internal.users.initiateUser, {
                        userId,
                        email,
                    });
                    break;
                // case "user.updated":
                // case "user.deleted"
                default:
                    console.log("Ignored Clerk webhook event", event.type);
            }
    
            return new Response(null, { status: 200 });


        } catch (error) {
            console.error("[/clerk-users-webhook]: Error occured: ", error);
            return new Response("Error occured", { status: 500});
        }

    }),
});


async function validateRequest(request: Request): Promise<WebhookEvent | undefined> {
    const payloadString = await request.text();

    const svixHeaders = {
        "svix-id": request.headers.get("svix-id")!,
        "svix-timestamp": request.headers.get("svix-timestamp")!,
        "svix-signature": request.headers.get("svix-signature")!,
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