import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const uploadImages = mutation({
  args: {
    files: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
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

    const user_id = identity.subject;
    const files = args.files;
    const uploadedFiles: { type: string; data: string; mimeType: string }[] =
      [];

    for (const file of files) {
      await ctx.db.insert("files", {
        name: file.name,
        url: file.url,
        size: file.size,
        authorId: user_id,
        mimeType: file.mimeType,
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
