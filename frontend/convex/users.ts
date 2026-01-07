import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";


export const initiateUser = internalMutation({
  args: {
    userId: v.string(), 
    email: v.string(),
  },
  handler: async (ctx, args) => {

    const { userId, email } = args;

    const userExistById = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("user_id"), userId))
      .first();

    if (userExistById !== null) throw new Error("User already exists");

    console.log(`Signing up ${userId}: ${email}`);

    await ctx.db.insert("users", {
      user_id: userId,
      email: email,
    });

    await ctx.db.insert("useage", {
      user_id: userId,
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
