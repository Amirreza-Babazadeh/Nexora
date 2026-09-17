import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// 1. Fetch notifications for the authenticated user (Real-time live query)
export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { notifications: [], unreadCount: 0 };
    }

    const allNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    // Sort descending by creation timestamp
    allNotifications.sort((a, b) => b.createdAt - a.createdAt);

    const unreadCount = allNotifications.filter((n) => !n.isRead).length;

    // Return the latest 30 notifications for the dropdown
    return {
      notifications: allNotifications.slice(0, 30),
      unreadCount,
    };
  },
});

// 2. Mark a single notification as read
export const markAsRead = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.id);
    if (!notification) {
      return false;
    }

    if (notification.userId !== identity.subject) {
      throw new Error("Unauthorized: You do not own this notification.");
    }

    if (!notification.isRead) {
      await ctx.db.patch(args.id, { isRead: true });
    }

    return true;
  },
});

// 3. Mark all unread notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", identity.subject).eq("isRead", false)
      )
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );

    return unreadNotifications.length;
  },
});

// 4. Clear / delete all notifications for the user
export const clearAllNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const allNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    await Promise.all(
      allNotifications.map((notification) => ctx.db.delete(notification._id))
    );

    return allNotifications.length;
  },
});
