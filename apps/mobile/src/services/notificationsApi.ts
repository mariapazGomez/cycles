import type { AppNotification } from '@cycles/shared';
import { apiRequest } from './httpClient';

export function fetchNotifications() {
  return apiRequest<AppNotification[]>('/notifications');
}

export function fetchUnreadCount() {
  return apiRequest<{ count: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return apiRequest<void>(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return apiRequest<void>('/notifications/read-all', { method: 'POST' });
}
