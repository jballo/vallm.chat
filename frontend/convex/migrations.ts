import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import { DataModel, Doc } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

export const setMessageUpdatedColumnNames = migrations.define({
    table: "messages",
    migrateOne: async (ctx, doc) => {
        const patch: Partial<Doc<"messages">> = {};

        if ( doc.authorId === undefined ) patch.authorId = doc.author_id;
        if (doc.chatId === undefined) patch.chatId = doc.chat_id;
        if (doc.modelId === undefined) patch.modelId = doc.model;
        if (doc.hasError === undefined) patch.hasError = doc.error;
        if (doc.errorDetail === undefined) patch.errorDetail = doc.errorMessage;
        if (doc.payload === undefined) patch.payload = doc.message;
        if (doc.isStreaming === undefined) patch.isStreaming = !doc.isComplete;
        
        if (Object.keys(patch).length === 0) return;

        await ctx.db.patch(doc._id, patch);
    },
});

export const addClarifyingColumnsToUsersTable = migrations.define({
    table: "users",
    migrateOne: async (ctx, doc) => {
        if (doc.externalId === undefined ) await ctx.db.patch(doc._id, { externalId: doc.user_id });
    },
});

export const runIt = migrations.runner(internal.migrations.addClarifyingColumnsToUsersTable);