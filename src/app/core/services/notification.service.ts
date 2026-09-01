import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Notification, NotificationType } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>(this.getNotificationsFromStorage());
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() {}

  createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    requestId?: string
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      actionUrl,
      requestId
    };

    const notifications = this.getNotificationsFromStorage();
    notifications.push(notification);
    localStorage.setItem('urbanclean_notifications', JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);

    return notification;
  }

  getUserNotifications(userId: string): Notification[] {
    return this.getNotificationsFromStorage()
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getUnreadCount(userId: string): number {
    return this.getUserNotifications(userId).filter(n => !n.read).length;
  }

  markAsRead(notificationId: string): boolean {
    const notifications = this.getNotificationsFromStorage();
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) {
      return false;
    }

    notification.read = true;
    localStorage.setItem('urbanclean_notifications', JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);

    return true;
  }

  markAllAsRead(userId: string): void {
    const notifications = this.getNotificationsFromStorage();
    notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });

    localStorage.setItem('urbanclean_notifications', JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);
  }

  deleteNotification(notificationId: string): boolean {
    const notifications = this.getNotificationsFromStorage();
    const index = notifications.findIndex(n => n.id === notificationId);

    if (index === -1) {
      return false;
    }

    notifications.splice(index, 1);
    localStorage.setItem('urbanclean_notifications', JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);

    return true;
  }

  clearAllNotifications(userId: string): void {
    const notifications = this.getNotificationsFromStorage()
      .filter(n => n.userId !== userId);

    localStorage.setItem('urbanclean_notifications', JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);
  }

  private getNotificationsFromStorage(): Notification[] {
    const stored = localStorage.getItem('urbanclean_notifications');
    if (stored) {
      const data = JSON.parse(stored);
      return data.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt)
      }));
    }
    return [];
  }
}
