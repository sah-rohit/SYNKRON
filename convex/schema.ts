import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Added for Ostinato:
    plan: v.optional(v.string()),
    username: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
  }).index("email", ["email"]),
  
  // Tracking Record for account handling
  activity_logs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(), // e.g. "login", "update_profile", "viewed_docs"
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
  }).index("by_user", ["userId"]),
  // Global Watcher Queue for GitHub Webhooks
  webhook_queue: defineTable({
    source: v.string(),
    payload: v.any(),
    status: v.string(), // "pending", "distributed", "processed"
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  processing_tasks: defineTable({
    webhookId: v.id("webhook_queue"),
    nodeId: v.string(), // Identifies local Rust binary node
    taskType: v.string(),
    status: v.string(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),
});
