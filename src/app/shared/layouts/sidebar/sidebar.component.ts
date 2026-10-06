import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isCollapsed = false;
  menuItems: Array<{ label: string; route: string; icon: string }> = [];
  userRole: string = '';
  unreadCount: number = 0;
  private userSub?: Subscription;
  private notifSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService = new NotificationService()
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getCurrentRole() || '';
    this.loadMenuItems();
    this.updateUnreadCount();

    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.userRole = user?.role || '';
      this.loadMenuItems();
      this.updateUnreadCount();
    });

    this.notifSub = this.notificationService.notifications$.subscribe(() => {
      this.updateUnreadCount();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.notifSub?.unsubscribe();
  }

  updateUnreadCount(): void {
    if (this.userRole === 'ADMIN' || this.userRole === 'SUPER_ADMIN') {
      this.unreadCount = this.notificationService.getAdminUnreadCount();
    } else {
      const user = this.authService.getCurrentUser();
      this.unreadCount = user ? this.notificationService.getUnreadCount(user.id) : 0;
    }
  }

  private loadMenuItems(): void {
    switch (this.userRole) {
      case 'SUPER_ADMIN':
        this.menuItems = [
          { label: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
          { label: 'Users', route: '/admin/users', icon: '👥' },
          { label: 'Collectors', route: '/super-admin/collectors', icon: '🚛' },
          { label: 'Requests', route: '/admin/requests', icon: '📋' },
          { label: 'Map', route: '/admin/map', icon: '🗺️' },
          { label: 'Reports', route: '/admin/reports', icon: '🚨' },
          { label: 'Notifications', route: '/admin/notifications', icon: '🔔' },
          { label: 'Profile', route: '/admin/profile', icon: '👤' }
        ];
        break;
      case 'ADMIN':
        this.menuItems = [
          { label: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
          { label: 'Requests', route: '/admin/requests', icon: '📋' },
          { label: 'Report', route: '/admin/reports', icon: '🚨' },
          { label: 'Map', route: '/admin/map', icon: '🗺️' },
          { label: 'Notifications', route: '/admin/notifications', icon: '🔔' },
          { label: 'Profile', route: '/admin/profile', icon: '👤' }
        ];
        break;
      case 'NORMAL_USER':
        this.menuItems = [
          { label: 'Dashboard', route: '/user/dashboard', icon: '🏠' },
          { label: 'Request Collection', route: '/user/request', icon: '➕' },
          { label: 'My Requests', route: '/user/requests', icon: '📋' },
          { label: 'Report', route: '/user/reports', icon: '🚨' },
          { label: 'Notifications', route: '/user/notifications', icon: '🔔' },
          { label: 'Profile', route: '/user/profile', icon: '👤' }
        ];
        break;
      case 'COLLECTOR':
        this.menuItems = [
          { label: 'Dashboard', route: '/collector/dashboard', icon: '📊' },
          { label: 'Assigned Collections', route: '/collector/requests', icon: '📋' },
          { label: 'Collection History', route: '/collector/history', icon: '📝' },
          { label: 'Notifications', route: '/collector/notifications', icon: '🔔' },
          { label: 'Profile', route: '/collector/profile', icon: '👤' }
        ];
        break;
      case 'RECYCLING_CENTRE':
        this.menuItems = [
          { label: 'Dashboard', route: '/centre/dashboard', icon: '📊' },
          { label: 'Recycling Requests', route: '/centre/requests', icon: '📋' },
          { label: 'Recycling History', route: '/centre/recycling', icon: '♻️' },
          { label: 'Notifications', route: '/centre/notifications', icon: '🔔' },
          { label: 'Profile', route: '/centre/profile', icon: '👤' }
        ];
        break;
      default:
        this.menuItems = [];
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
