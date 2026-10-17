import type { AppNotification } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export function listNotifications() {
  return apiRequest<AppNotification[]>("/notifications");
}

export function unreadNotificationCount() {
  return apiRequest<{ count: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return apiRequest<void>(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return apiRequest<void>("/notifications/read-all", { method: "POST" });
}
