import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";


export const initiateUser = internalMutation({
  args: {
    externalId: v.string(), 
    email: v.string(),
  },
  handler: async (ctx, args) => {

    const { externalId, email } = args;

    const userByExternalId = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", externalId))
      .unique();

    if (userByExternalId !== null) throw new ConvexError("User already exists");

    console.log(`Signing up ${externalId}: ${email}`);

    await ctx.db.insert("users", {
      user_id: externalId,
      email: email,
      externalId,
    });

    await ctx.db.insert("useage", {
      user_id: externalId,
      messagesRemaining: 50,
    });
  },
});

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const remainingCredits = await ctx.db
      .query("useage")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .unique();

    return remainingCredits;
  },
});

export const updateUseage = mutation({
  args: {
    useageId: v.id("useage"),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    const idenity = await ctx.auth.getUserIdentity();
    if (!idenity) throw new Error("Not authenticated!");

    const { useageId, credits } = args;

    await ctx.db.patch(useageId, { messagesRemaining: credits });
  },
});
