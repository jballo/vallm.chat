// import { internalMutation } from "./_generated/server";
// import { v4 as uuidv4 } from 'uuid';

import { internalMutation } from "./_generated/server";

// export const giveAllMessagesUUID = internalMutation({
//     handler: async (ctx) => {
//         const allMessages = await ctx.db.query("messages").collect();

//         allMessages.map(async (message) => {
//             const newId = uuidv4();
//             if (message.clientId === undefined) {
//                 await ctx.db.patch(message._id, {
//                     clientId: newId,
//                 });
//             }
//         });
//     }
// })


export const migrateMessagesSchema = internalMutation({
    args: {},
    handler: async (ctx) => {
        const messages = await ctx.db.query("messages").collect();

        let migratedCount = 0;

        for (const message of messages) {
            
        }
    }
})