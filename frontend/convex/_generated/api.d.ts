/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as chat from "../chat.js";
import type * as files from "../files.js";
import type * as keysActions from "../keysActions.js";
import type * as keysMutations from "../keysMutations.js";
import type * as messages from "../messages.js";
import type * as schema_types from "../schema/types.js";
import type * as sharing from "../sharing.js";
import type * as users from "../users.js";
import type * as utils_encryption from "../utils/encryption.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  files: typeof files;
  keysActions: typeof keysActions;
  keysMutations: typeof keysMutations;
  messages: typeof messages;
  "schema/types": typeof schema_types;
  sharing: typeof sharing;
  users: typeof users;
  "utils/encryption": typeof utils_encryption;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
