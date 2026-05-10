import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Log a user activity (tracking record)
export const logActivity = mutation({
  args: {
    action: v.string(),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    await ctx.db.insert("activity_logs", {
      userId: userId ?? undefined,
      action: args.action,
      metadata: args.metadata,
      ipAddress: args.ipAddress,
      deviceInfo: args.deviceInfo,
    });
  },
});

// Retrieve activity logs for a user
export const getUserLogs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query("activity_logs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});
