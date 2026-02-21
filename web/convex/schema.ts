import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Investigation sessions
  sessions: defineTable({
    sessionId: v.string(),
    objective: v.string(),
    provider: v.string(),
    model: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("error"),
      v.literal("stopped")
    ),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    steps: v.number(),
    elapsed: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"]),

  // Real-time event stream for each session
  events: defineTable({
    sessionId: v.string(),
    type: v.union(
      v.literal("trace"),
      v.literal("step"),
      v.literal("result"),
      v.literal("error"),
      v.literal("delta")
    ),
    data: v.any(),
    timestamp: v.number(),
    seq: v.number(),
  })
    .index("by_session", ["sessionId", "seq"])
    .index("by_session_type", ["sessionId", "type"]),
});
