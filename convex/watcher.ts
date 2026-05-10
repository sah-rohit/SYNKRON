import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Global Watcher: Receives incoming GitHub webhooks and pushes to internal queue.
 */
export const ingestWebhook = mutation({
  args: {
    source: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("webhook_queue", {
      source: args.source,
      payload: args.payload,
      status: "pending",
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Distribution Hub: Local Rust binaries poll this to fetch pending tasks.
 */
export const fetchPendingTasks = query({
  args: { nodeId: v.string() },
  handler: async (ctx) => {
    // Get pending queue items
    return await ctx.db
      .query("webhook_queue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(10);
  },
});

/**
 * Acknowledges that a local binary claimed the task.
 */
export const claimTask = mutation({
  args: {
    webhookId: v.id("webhook_queue"),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.webhookId);
    if (!item || item.status !== "pending") {
      throw new Error("Task already claimed or does not exist.");
    }

    // Mark as distributed
    await ctx.db.patch(args.webhookId, { status: "distributed" });

    // Create a dedicated task tracking record
    const taskId = await ctx.db.insert("processing_tasks", {
      webhookId: args.webhookId,
      nodeId: args.nodeId,
      taskType: "AST_AND_HEAL",
      status: "in_progress",
      updatedAt: Date.now(),
    });

    return taskId;
  },
});

/**
 * Completes the task cycle.
 */
export const completeTask = mutation({
  args: {
    taskId: v.id("processing_tasks"),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return;

    await ctx.db.patch(args.taskId, {
      status: args.success ? "completed" : "failed",
      updatedAt: Date.now(),
    });

    // Finally mark the source webhook fully processed
    await ctx.db.patch(task.webhookId, { status: "processed" });
  },
});
