"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "@/lib/store/useAuth";
import { toast } from "sonner";
import axios from "axios";
import { requestForToken, onMessageListener } from "@/lib/firebase";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  requestPermission: () => Promise<void>;
  permissionStatus: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== "undefined" ? Notification.permission : "default"
  );

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await axios.get(
        `/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        },
      );
      setNotifications(response.data);
    } catch (error) {
      console.error("[NotificationProvider] Failed to fetch notifications:", error);
    }
  }, [accessToken]);

  const requestPermission = async () => {
    if (typeof window === "undefined") return;

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (permission === "granted" && accessToken) {
      const token = await requestForToken();
      if (token) {
        await axios
          .post(
            `/api/notifications/fcm-token`,
            { token },
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              withCredentials: true,
            },
          )
          .catch((err) => console.error("Failed to save FCM token:", err));
        toast.success("Push notifications enabled!");
      }
    }
  };

  useEffect(() => {
    if (!isInitialized) return;

    if (user?.id && accessToken) {
      const loadNotifications = async () => {
        await fetchNotifications();
      };
      void loadNotifications();

      const socketUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";
      const newSocket = io(`${socketUrl}/notifications`, {
        query: { userId: user.id },
        auth: {
          token: accessToken,
        },
        transports: ["websocket"],
        reconnectionAttempts: 3,
        timeout: 8000,
      });

      newSocket.on("newNotification", (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        toast.info(notification.title, {
          description: notification.message,
        });
      });

      if (Notification.permission === "granted") {
        requestForToken().then((token) => {
          if (token) {
            axios
              .post(
                `/api/notifications/fcm-token`,
                { token },
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                  withCredentials: true,
                },
              )
              .catch((err) => console.error("Failed to save FCM token:", err));
          }
        });
      }

      onMessageListener().then((payload) => {
        const message = payload as { notification?: { title?: string; body?: string } };
        if (message.notification) {
          toast.info(message.notification.title, {
            description: message.notification.body,
          });
          fetchNotifications();
        }
      });

      return () => {
        newSocket.disconnect();
      };
    } else {
      queueMicrotask(() => setNotifications([]));
    }
  }, [user?.id, accessToken, isInitialized]);

  const markAsRead = async (id: string) => {
    if (!accessToken) return;
    // Optimistic update
    const previousNotifications = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      await axios.patch(
        `/api/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        },
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // Revert on error
      setNotifications(previousNotifications);
    }
  };

  const markAllAsRead = async () => {
    if (!accessToken) return;
    // Optimistic update
    const previousNotifications = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await axios.patch(
        `/api/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        },
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      // Revert on error
      setNotifications(previousNotifications);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!accessToken) return;
    // Optimistic update
    const previousNotifications = [...notifications];
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await axios.patch(
        `/api/notifications/${id}/delete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        },
      );
      toast.success("Notification purged");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Purge failed");
      // Revert on error
      setNotifications(previousNotifications);
    }
  };

  const deleteAllNotifications = async () => {
    if (!accessToken) return;
    
    // Optimistic update
    const previousNotifications = [...notifications];
    setNotifications([]);
    try {
      await axios.patch(
        `/api/notifications/delete-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        },
      );
      toast.success("Buffer cleared");
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
      toast.error("Clear failed");
      // Revert on error
      setNotifications(previousNotifications);
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        requestPermission,
        permissionStatus,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};


