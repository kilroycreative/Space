import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Queries — these are reactive (auto-update in the browser)
// ---------------------------------------------------------------------------

/** List all sessions, newest first. */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("sessions")
      .withIndex("by_startedAt")
      .order("desc")
      .take(limit);
  },
});

/** Get a single session by sessionId. */
export const get = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

/** Get events for a session (paginated). */
export const getEvents = query({
  args: {
    sessionId: v.string(),
    afterSeq: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const afterSeq = args.afterSeq ?? -1;
    const limit = args.limit ?? 200;

    return await ctx.db
      .query("events")
      .withIndex("by_session", (q) =>
        q.eq("sessionId", args.sessionId).gt("seq", afterSeq)
      )
      .take(limit);
  },
});

/** Get the latest event seq for a session (for polling). */
export const latestSeq = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("events")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    return latest?.seq ?? -1;
  },
});

// ---------------------------------------------------------------------------
// Mutations — called by the Python worker to push state updates
// ---------------------------------------------------------------------------

/** Create a new session. */
export const create = mutation({
  args: {
    sessionId: v.string(),
    objective: v.string(),
    provider: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessions", {
      sessionId: args.sessionId,
      objective: args.objective,
      provider: args.provider,
      model: args.model,
      status: "running",
      steps: 0,
      elapsed: 0,
      startedAt: Date.now(),
    });
  },
});

/** Push an event from the worker. */
export const pushEvent = mutation({
  args: {
    sessionId: v.string(),
    type: v.union(
      v.literal("trace"),
      v.literal("step"),
      v.literal("result"),
      v.literal("error"),
      v.literal("delta")
    ),
    data: v.any(),
    seq: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("events", {
      sessionId: args.sessionId,
      type: args.type,
      data: args.data,
      timestamp: Date.now(),
      seq: args.seq,
    });
  },
});

/** Batch push events (more efficient for high-throughput). */
export const pushEvents = mutation({
  args: {
    events: v.array(
      v.object({
        sessionId: v.string(),
        type: v.union(
          v.literal("trace"),
          v.literal("step"),
          v.literal("result"),
          v.literal("error"),
          v.literal("delta")
        ),
        data: v.any(),
        seq: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const event of args.events) {
      await ctx.db.insert("events", {
        ...event,
        timestamp: Date.now(),
      });
    }
  },
});

/** Update session progress (steps, elapsed). */
export const updateProgress = mutation({
  args: {
    sessionId: v.string(),
    steps: v.number(),
    elapsed: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (session) {
      await ctx.db.patch(session._id, {
        steps: args.steps,
        elapsed: args.elapsed,
      });
    }
  },
});

/** Mark session as completed. */
export const complete = mutation({
  args: {
    sessionId: v.string(),
    result: v.string(),
    steps: v.number(),
    elapsed: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (session) {
      await ctx.db.patch(session._id, {
        status: "completed",
        result: args.result,
        steps: args.steps,
        elapsed: args.elapsed,
        completedAt: Date.now(),
      });
    }
  },
});

/** Mark session as errored. */
export const fail = mutation({
  args: {
    sessionId: v.string(),
    error: v.string(),
    elapsed: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (session) {
      await ctx.db.patch(session._id, {
        status: "error",
        error: args.error,
        elapsed: args.elapsed,
        completedAt: Date.now(),
      });
    }
  },
});
