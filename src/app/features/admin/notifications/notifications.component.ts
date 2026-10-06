import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification, NotificationType } from '../../../core/models/index';

type FilterType = 'ALL' | 'UNREAD' | 'READ';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  activeFilter: FilterType = 'ALL';
  searchTerm: string = '';

  // Delete modal state
  notificationToDelete: Notification | null = null;
  showDeleteModal: boolean = false;

  private notifSubscription?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();

    this.notifSubscription = this.notificationService.notifications$.subscribe(() => {
      this.loadNotifications();
    });
  }

  ngOnDestroy(): void {
    this.notifSubscription?.unsubscribe();
  }

  loadNotifications(): void {
    this.notifications = this.notificationService.getAdminNotifications();
    this.applyFilters();
  }

  setFilter(filter: FilterType): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  applyFilters(): void {
    let list = [...this.notifications];

    // Status Filter
    if (this.activeFilter === 'UNREAD') {
      list = list.filter(n => !n.read);
    } else if (this.activeFilter === 'READ') {
      list = list.filter(n => n.read);
    }

    // Search Query (title, message, requestId, targetUserId, userName)
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (term) {
      list = list.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(term);
        const msgMatch = (n.message || '').toLowerCase().includes(term);
        const reqMatch = (n.requestId || '').toLowerCase().includes(term);
        const userMatch = (n.targetUserId || n.userId || '').toLowerCase().includes(term);
        const nameMatch = (n.userName || '').toLowerCase().includes(term);
        return titleMatch || msgMatch || reqMatch || userMatch || nameMatch;
      });
    }

    this.filteredNotifications = list;
  }

  get totalCount(): number {
    return this.notifications.length;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get readCount(): number {
    return this.notifications.filter(n => n.read).length;
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.read) {
      notification.read = true;
      this.notificationService.markAsRead(notification.id);
      this.applyFilters();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => (n.read = true));
    this.notificationService.markAllAsRead('ADMIN');
    this.applyFilters();
  }

  promptDelete(notification: Notification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationToDelete = notification;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.notificationToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (this.notificationToDelete) {
      this.notificationService.deleteNotification(this.notificationToDelete.id);
      this.loadNotifications();
      this.cancelDelete();
    }
  }

  getTypeIcon(type: NotificationType): string {
    switch (type) {
      case 'request-submitted':
        return '📋';
      case 'request-accepted':
        return '✅';
      case 'request-rejected':
        return '❌';
      case 'collection-completed':
        return '♻️';
      case 'system':
        return '👤';
      case 'reminder':
        return '⏰';
      default:
        return '🔔';
    }
  }
}
