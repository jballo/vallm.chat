import { v } from "convex/values";

export const coreTextPart = v.object({
  type: v.literal("text"),
  text: v.string(),
});

export const coreImagePart = v.object({
  type: v.literal("image"),
  image: v.string(), // url
  mimeType: v.optional(v.string()),
});

export const coreFilePart = v.object({
  type: v.literal("file"),
  data: v.string(), // url
  mimeType: v.string(),
});

export const coreContent = v.union(
  v.string(),
  v.array(v.union(coreTextPart, coreImagePart, coreFilePart))
);

// const modelMessage = v.object({
//   role: v.union(
//     v.literal("system"),
//     v.literal("user"),
//     v.literal("assistant"),
//     v.literal("tool")
//   ),
//   content: coreContent,
// });

export const coreMessage = v.object({
  role: v.union(
    v.literal("system"),
    v.literal("user"),
    v.literal("assistant"),
    v.literal("tool")
  ),
  content: coreContent,
});
