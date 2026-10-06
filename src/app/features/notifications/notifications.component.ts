import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models/index';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `<section class="page"><p class="eyebrow">UPDATES</p><h1>Notifications</h1><div class="notification-list"><article *ngFor="let notification of notifications" [class.unread]="!notification.read"><div><strong>{{ notification.title }}</strong><p>{{ notification.message }}</p></div><time>{{ notification.createdAt | date:'medium' }}</time></article><div *ngIf="notifications.length === 0" class="empty">No notifications yet.</div></div></section>`,
  styles: [`
    .page{max-width:900px;margin:0 auto}.eyebrow{color:#0D9488;letter-spacing:2px;font-size:12px;font-weight:700}h1{color:#17211B;margin:4px 0 24px}.notification-list{display:grid;gap:10px}.notification-list article{display:flex;justify-content:space-between;gap:20px;background:#fff;border:1px solid #dcfce7;border-left:4px solid #cbdacf;border-radius:6px;padding:18px 20px}.notification-list article.unread{border-left-color:#22C55E;background:#f7fff9}.notification-list strong{color:#17211B}.notification-list p{color:#64748B;margin:7px 0 0}.notification-list time{color:#64748B;font-size:12px;white-space:nowrap}.empty{padding:35px;text-align:center;color:#64748B;background:#fff;border-radius:8px}@media(max-width:600px){.notification-list article{display:block}.notification-list time{display:block;margin-top:12px}}
  `]
})
export class NotificationsComponent {
  notifications: Notification[] = [];
  constructor(private authService: AuthService, private notificationService: NotificationService) {}
  ngOnInit(): void { const user = this.authService.getCurrentUser(); this.notifications = user ? this.notificationService.getUserNotifications(user.id) : []; }
}
