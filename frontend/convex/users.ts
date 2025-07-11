import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const initiateUser = mutation({
  args: {
    user_id: v.string(),
    user_email: v.string(),
  },
  handler: async (ctx, args) => {
    const { user_id, user_email } = args;

    console.log(`Signing up ${user_id}: ${user_email}`);

    await ctx.db.insert("users", {
      user_id: user_id,
      email: user_email,
    });

    await ctx.db.insert("useage", {
      user_id: user_id,
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
