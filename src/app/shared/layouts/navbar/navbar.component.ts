import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;
  unreadNotificationCount = 0;
  showProfileMenu = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.updateNotificationCount();

    // Subscribe to user updates
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Subscribe to notifications
    this.notificationService.notifications$.subscribe(() => {
      this.updateNotificationCount();
    });
  }

  updateNotificationCount(): void {
    if (this.currentUser) {
      this.unreadNotificationCount = this.notificationService.getUnreadCount(this.currentUser.id);
    }
  }

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
  }

  goToProfile(): void {
    this.showProfileMenu = false;
    // Navigate to profile based on role
    const role = this.authService.getCurrentRole();
    if (role === 'normal-user') {
      this.router.navigate(['/user/profile']);
    } else if (role === 'collector') {
      this.router.navigate(['/collector/profile']);
    } else if (role === 'recycling-centre') {
      this.router.navigate(['/centre/profile']);
    }
  }

  goToNotifications(): void {
    const role = this.authService.getCurrentRole();
    if (role === 'normal-user') {
      this.router.navigate(['/user/notifications']);
    } else if (role === 'collector') {
      this.router.navigate(['/collector/notifications']);
    } else if (role === 'recycling-centre') {
      this.router.navigate(['/centre/notifications']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
