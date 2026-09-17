import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// 1. Get authenticated user's Nexora record (returns null if unauthenticated or not onboarded)
export const getMyUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Fast lookup using by_clerkUserId index
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (user) return user;

    // Fallback for legacy documents using by_clerkId index
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

// 2. Backward-compatible alias for getCurrentUser
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (user) return user;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

// 3. Create user upon onboarding completion
// Validates role, derives identity exclusively from Clerk JWT session, prevents duplicates and prevents role mutation
export const createMyUser = mutation({
  args: {
    role: v.union(v.literal("candidate"), v.literal("employer")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated. Please sign in to complete onboarding.");
    }

    const clerkUserId = identity.subject;

    // Prevent duplicate user creation (check by_clerkUserId index)
    const existingByClerkUserId = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (existingByClerkUserId) {
      // Role is strictly immutable: return existing user without modifying role
      return existingByClerkUserId;
    }

    // Check legacy by_clerkId index
    const existingByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkUserId))
      .unique();

    if (existingByClerkId) {
      // Role is strictly immutable: return existing user without modifying role
      return existingByClerkId;
    }

    // Extract first and last names directly from Clerk identity
    const nameParts = identity.name ? identity.name.trim().split(/\s+/) : [];
    const derivedFirstName = nameParts[0] || "User";
    const derivedLastName = nameParts.slice(1).join(" ") || "";

    const firstName = identity.givenName || derivedFirstName;
    const lastName = identity.familyName || derivedLastName;

    const name = `${firstName} ${lastName}`.trim();

    const userId = await ctx.db.insert("users", {
      clerkUserId,
      clerkId: clerkUserId,
      firstName,
      lastName,
      name: name || undefined,
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
      role: args.role,
    });

    return await ctx.db.get(userId);
  },
});

// 4. Webhook sync handler for Clerk user profile updates
export const syncUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkId))
      .unique();

    if (!existingUser) {
      existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .unique();
    }

    const firstName = args.name ? args.name.trim().split(/\s+/)[0] || "User" : "User";
    const lastName = args.name ? args.name.trim().split(/\s+/).slice(1).join(" ") || "" : "";

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        firstName: existingUser.firstName || firstName,
        lastName: existingUser.lastName || lastName,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        // Role is immutable, so it is never overwritten by sync
      });
      return existingUser._id;
    }

    if (args.role === "candidate" || args.role === "employer") {
      return await ctx.db.insert("users", {
        clerkUserId: args.clerkId,
        clerkId: args.clerkId,
        firstName,
        lastName,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        role: args.role,
      });
    }

    return null;
  },
});

// 5. Webhook deletion handler
export const deleteUser = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user =
      (await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkId))
        .unique()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .unique());

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

// 6. Migration helper: Backfill legacy user documents
export const migrateLegacyUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    let updatedCount = 0;

    for (const user of allUsers) {
      const needsClerkUserId = !user.clerkUserId;
      const needsFirstName = !user.firstName;
      const needsLastName = user.lastName === undefined;

      if (needsClerkUserId || needsFirstName || needsLastName) {
        const clerkUserId = user.clerkUserId ?? user.clerkId ?? "";
        const nameParts = user.name ? user.name.trim().split(/\s+/) : [];
        const firstName = user.firstName ?? nameParts[0] ?? "User";
        const lastName = user.lastName ?? nameParts.slice(1).join(" ") ?? "";

        await ctx.db.patch(user._id, {
          clerkUserId,
          firstName,
          lastName,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      totalUsers: allUsers.length,
      updatedUsers: updatedCount,
    };
  },
});

// 7. Client sync helper: Sync real Clerk profile details into Convex record
export const syncMyUserIdentity = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user =
      (await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
        .unique()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique());

    if (!user) return null;

    const updates: Record<string, string> = {};

    if (args.name && args.name.trim() !== "" && args.name.trim().toLowerCase() !== "user") {
      const trimmed = args.name.trim();
      if (!user.name || user.name === "User" || user.firstName === "User" || !user.firstName) {
        const parts = trimmed.split(/\s+/);
        updates.firstName = parts[0];
        updates.lastName = parts.slice(1).join(" ") || "";
        updates.name = trimmed;
      }
    }

    if (args.email && args.email.trim() !== "") {
      if (!user.email || user.email === "") {
        updates.email = args.email.trim();
      }
    }

    if (args.imageUrl && !user.imageUrl) {
      updates.imageUrl = args.imageUrl;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }

    return await ctx.db.get(user._id);
  },
});


