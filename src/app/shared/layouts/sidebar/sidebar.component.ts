import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  isCollapsed = false;
  menuItems: Array<{ label: string; route: string; icon: string }> = [];
  userRole: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getCurrentRole() || '';
    this.loadMenuItems();
  }

  private loadMenuItems(): void {
    switch (this.userRole) {
      case 'super-admin':
        this.menuItems = [
          { label: 'Dashboard', route: '/super-admin/dashboard', icon: '📊' },
          { label: 'Users', route: '/super-admin/users', icon: '👥' },
          { label: 'Admins', route: '/super-admin/admins', icon: '🔐' },
          { label: 'Collectors', route: '/super-admin/collectors', icon: '🚚' },
          { label: 'Recycling Centres', route: '/super-admin/recycling-centres', icon: '♻️' },
          { label: 'Requests', route: '/super-admin/requests', icon: '📋' },
          { label: 'Reports', route: '/super-admin/reports', icon: '🚨' },
          { label: 'Map', route: '/super-admin/map', icon: '🗺️' },
          { label: 'Analytics', route: '/super-admin/analytics', icon: '📈' },
          { label: 'Settings', route: '/super-admin/settings', icon: '⚙️' }
        ];
        break;
      case 'admin':
        this.menuItems = [
          { label: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
          { label: 'Users', route: '/admin/users', icon: '👥' },
          { label: 'Collectors', route: '/admin/collectors', icon: '🚚' },
          { label: 'Recycling Centres', route: '/admin/recycling-centres', icon: '♻️' },
          { label: 'Requests', route: '/admin/requests', icon: '📋' },
          { label: 'Reports', route: '/admin/reports', icon: '🚨' },
          { label: 'Map', route: '/admin/map', icon: '🗺️' },
          { label: 'Analytics', route: '/admin/analytics', icon: '📈' }
        ];
        break;
      case 'normal-user':
        this.menuItems = [
          { label: 'Dashboard', route: '/user/dashboard', icon: '🏠' },
          { label: 'Request Collection', route: '/user/request', icon: '➕' },
          { label: 'My Requests', route: '/user/requests', icon: '📋' },
          { label: 'Map', route: '/user/map', icon: '🗺️' },
          { label: 'Rewards', route: '/user/rewards', icon: '🏆' },
          { label: 'Reports', route: '/user/reports', icon: '🚨' },
          { label: 'Notifications', route: '/user/notifications', icon: '🔔' },
          { label: 'Profile', route: '/user/profile', icon: '👤' }
        ];
        break;
      case 'collector':
        this.menuItems = [
          { label: 'Dashboard', route: '/collector/dashboard', icon: '📊' },
          { label: 'Requests', route: '/collector/requests', icon: '📋' },
          { label: 'Schedule', route: '/collector/schedule', icon: '📅' },
          { label: 'History', route: '/collector/history', icon: '📝' },
          { label: 'Map', route: '/collector/map', icon: '🗺️' },
          { label: 'Notifications', route: '/collector/notifications', icon: '🔔' },
          { label: 'Profile', route: '/collector/profile', icon: '👤' }
        ];
        break;
      case 'recycling-centre':
        this.menuItems = [
          { label: 'Dashboard', route: '/centre/dashboard', icon: '📊' },
          { label: 'Requests', route: '/centre/requests', icon: '📋' },
          { label: 'Recycling Activity', route: '/centre/recycling', icon: '♻️' },
          { label: 'Map', route: '/centre/map', icon: '🗺️' },
          { label: 'Notifications', route: '/centre/notifications', icon: '🔔' },
          { label: 'Profile', route: '/centre/profile', icon: '👤' }
        ];
        break;
    }
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
