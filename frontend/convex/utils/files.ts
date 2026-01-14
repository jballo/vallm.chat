"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { UTApi } from "uploadthing/server";

export const utapi = new UTApi();

export const deleteUploadThingFile = internalAction({
    args: {
        key: v.string(),
    },
    handler: async (ctx, args): Promise< {success: true ; message: string; } | { success: false; error: string;}> => {

        const { key } = args;

        const result = await utapi.deleteFiles(key);

        console.log("result: ", result);

        if (result.success === false) return { success: false, error: "Failed to delete file"};

        return { success: true, message: "Successfully deleted file" };
    }
})