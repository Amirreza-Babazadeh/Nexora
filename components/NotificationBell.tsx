"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Bell,
  CheckCheck,
  Briefcase,
  Sparkles,
  Clock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Format timestamp into relative human-readable string
function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time Convex query
  const data = useQuery(api.notifications.getMyNotifications);

  const markAsRead = useMutation(api.notifications.markAsRead).withOptimisticUpdate(
    (localStore, { id }) => {
      const current = localStore.getQuery(api.notifications.getMyNotifications, {});
      if (current) {
        let countDecreased = false;
        const updatedNotifications = current.notifications.map((n) => {
          if (n._id === id && !n.isRead) {
            countDecreased = true;
            return { ...n, isRead: true };
          }
          return n;
        });
        localStore.setQuery(api.notifications.getMyNotifications, {}, {
          notifications: updatedNotifications,
          unreadCount: countDecreased ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
        });
      }
    }
  );

  const markAllAsRead = useMutation(api.notifications.markAllAsRead).withOptimisticUpdate(
    (localStore) => {
      const current = localStore.getQuery(api.notifications.getMyNotifications, {});
      if (current) {
        localStore.setQuery(api.notifications.getMyNotifications, {}, {
          notifications: current.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        });
      }
    }
  );

  const clearAllNotifications = useMutation(
    api.notifications.clearAllNotifications,
  ).withOptimisticUpdate((localStore) => {
    localStore.setQuery(api.notifications.getMyNotifications, {}, {
      notifications: [],
      unreadCount: 0,
    });
  });

  const notifications = useMemo(() => data?.notifications ?? [], [data?.notifications]);
  const unreadCount = data?.unreadCount ?? 0;

  // Track latest notification to trigger a subtle toast when new items arrive
  const prevCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevCountRef.current !== null && unreadCount > prevCountRef.current) {
      const latest = notifications[0];
      if (latest) {
        toast.info(latest.title, {
          description: latest.message,
        });
      }
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount, notifications]);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (
    id: Id<"notifications">,
    link?: string,
    isRead?: boolean,
  ) => {
    if (!isRead) {
      try {
        await markAsRead({ id });
      } catch {
        // silent fallback
      }
    }
    setIsOpen(false);
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead({});
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications({});
      toast.success("Notifications cleared");
      setIsOpen(false);
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="relative rounded-full hover:bg-muted/80 transition-colors"
      >
        <Bell
          className={`w-5 h-5 transition-transform ${
            unreadCount > 0
              ? "text-primary animate-ring-bell"
              : "text-muted-foreground hover:text-foreground"
          }`}
        />

        {/* Active Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground shadow-xs animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-84 sm:w-96 rounded-2xl bg-popover border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Badge
                  variant="default"
                  className="text-[10px] px-1.5 py-0 h-4 font-bold"
                >
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary/80"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Mark all read
                </Button>
              )}

              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClearAll}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* List of Notifications */}
          <div className="max-h-95 overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-xl shadow-xs">
                  🔔
                </div>
                <p className="text-sm font-bold text-foreground">
                  No notifications yet
                </p>
                <p className="text-xs max-w-xs text-muted-foreground">
                  You will receive real-time alerts when candidates apply or
                  application stages update.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isApplication = notif.type === "application_received";
                const isStatus = notif.type === "status_change";

                return (
                  <div
                    key={notif._id}
                    onClick={() =>
                      handleNotificationClick(
                        notif._id,
                        notif.link,
                        notif.isRead,
                      )
                    }
                    className={`group px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notif.isRead
                        ? "bg-primary/5 dark:bg-primary/10"
                        : "bg-transparent"
                    }`}
                  >
                    {/* Type Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-sm shadow-xs mt-0.5 ${
                        isApplication
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : isStatus
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isApplication ? (
                        <Briefcase className="w-4 h-4" />
                      ) : isStatus ? (
                        <Sparkles className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
