import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const uploadImages = mutation({
  args: {
    files: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        key: v.string(),
        mimeType: v.string(),
        size: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("User not found");

    const files = args.files;
    const uploadedFiles: { type: string; data: string; mimeType: string }[] =
      [];

    for (const file of files) {
      await ctx.db.insert("files", {
        name: file.name,
        url: file.url,
        size: file.size,
        ownerId: user._id,
        mimeType: file.mimeType,
        key: file.key,
      });
      uploadedFiles.push({
        type: "file",
        data: file.url,
        mimeType: file.mimeType,
      });
    }

    return uploadedFiles;
  },
});
