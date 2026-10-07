import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
    requestId?: string,
    targetUserId?: string,
    userName?: string,
    recipientRole: 'ADMIN' | 'NORMAL_USER' | 'COLLECTOR' | 'RECYCLING_CENTRE' | 'ALL' = userId === 'ADMIN' ? 'ADMIN' : 'NORMAL_USER'
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      recipientRole,
      targetRole: recipientRole,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      actionUrl,
      requestId,
      targetUserId,
      userName
    };

    const notifications = this.getNotificationsFromStorage();
    notifications.push(notification);
    localStorage.setItem('urbanclean_notifications', JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);

    return notification;
  }

  getAdminNotifications(): Notification[] {
    return this.getNotificationsFromStorage()
      .filter(n => n.recipientRole === 'ADMIN' || n.targetRole === 'ADMIN' || n.userId === 'ADMIN' || n.userId === 'admin')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAdminUnreadCount(): number {
    return this.getAdminNotifications().filter(n => !n.read).length;
  }

  getUserNotifications(userId: string): Notification[] {
    return this.getNotificationsFromStorage()
      .filter(n => n.userId === userId || (n.recipientRole === 'NORMAL_USER' && n.targetUserId === userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getUnreadCount(userId: string): number {
    if (userId === 'ADMIN' || userId === 'admin') {
      return this.getAdminUnreadCount();
    }
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

  markAllAsRead(userId: string = 'ADMIN'): void {
    const notifications = this.getNotificationsFromStorage();
    notifications.forEach(n => {
      if (userId === 'ADMIN' || userId === 'admin') {
        if (n.recipientRole === 'ADMIN' || n.targetRole === 'ADMIN' || n.userId === 'ADMIN' || n.userId === 'admin') {
          n.read = true;
        }
      } else if (n.userId === userId || n.targetUserId === userId) {
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
      .filter(n => {
        if (userId === 'ADMIN' || userId === 'admin') {
          return !(n.recipientRole === 'ADMIN' || n.targetRole === 'ADMIN' || n.userId === 'ADMIN');
        }
        return n.userId !== userId;
      });

    localStorage.setItem('urbanclean_notifications', JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);
  }

  public refresh(): void {
    this.notificationsSubject.next(this.getNotificationsFromStorage());
  }

  public getNotificationsFromStorage(): Notification[] {
    const stored = localStorage.getItem('urbanclean_notifications');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          return data.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt)
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  }
}
