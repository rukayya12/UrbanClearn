import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { RewardService } from '../../../core/services/reward.service';
import { NotificationService } from '../../../core/services/notification.service';
import { WasteRequest } from '../../../core/models/request.model';
import { User } from '../../../core/models/user.model';
import { Notification } from '../../../core/models/index';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  totalRequests = 0;
  pendingRequests = 0;
  completedRequests = 0;
  greenPoints = 0;
  ecoPoints = 0;
  recentRequests: WasteRequest[] = [];
  userNotifications: Notification[] = [];
  unreadNotificationCount = 0;
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private requestService: RequestService,
    private rewardService: RewardService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Immediately load current user from AuthService
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();

    // 2. React to session or user changes
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.loadDashboardData();
      })
    );

    // 3. React to requests changes
    this.subscriptions.add(
      this.requestService.requests$.subscribe(() => {
        this.loadDashboardData();
      })
    );

    // 4. React to notifications changes
    this.subscriptions.add(
      this.notificationService.notifications$.subscribe(() => {
        this.loadDashboardData();
      })
    );

    // 5. React to rewards changes
    this.subscriptions.add(
      this.rewardService.rewards$.subscribe(() => {
        this.loadDashboardData();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadDashboardData(): void {
    if (!this.currentUser) {
      this.totalRequests = 0;
      this.pendingRequests = 0;
      this.completedRequests = 0;
      this.greenPoints = 0;
      this.recentRequests = [];
      this.userNotifications = [];
      this.unreadNotificationCount = 0;
      return;
    }

    // Filter requests strictly for this logged-in user
    const userRequests = this.requestService.getUserRequests(this.currentUser.id);
    this.totalRequests = userRequests.length;
    this.pendingRequests = userRequests.filter(r => 
      ['pending', 'received', 'scheduling'].includes(r.status)
    ).length;
    this.completedRequests = userRequests.filter(r => r.status === 'completed').length;
    this.recentRequests = userRequests.slice(0, 5);

    // Calculate dynamic reward points from rewards service + user's completed requests
    const userRewards = this.rewardService.getUserRewards(this.currentUser.id);
    const completedPoints = userRequests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.greenPoints || 0), 0);
    this.greenPoints = Math.max(userRewards?.totalPoints || 0, completedPoints);
    this.ecoPoints = this.greenPoints;

    // Get notifications for this logged-in user
    this.userNotifications = this.notificationService.getUserNotifications(this.currentUser.id).slice(0, 3);
    this.unreadNotificationCount = this.notificationService.getUnreadCount(this.currentUser.id);
  }

  createNewRequest(): void {
    this.router.navigate(['/user/request']);
  }

  viewAllRequests(): void {
    this.router.navigate(['/user/requests']);
  }

  viewNotifications(): void {
    this.router.navigate(['/user/notifications']);
  }

  viewProfile(): void {
    this.router.navigate(['/user/profile']);
  }

  formatRole(role?: string): string {
    if (!role) return 'Normal User';
    switch (role) {
      case 'NORMAL_USER':
      case 'normal-user':
        return 'Normal User';
      case 'ADMIN':
      case 'admin':
        return 'Administrator';
      case 'SUPER_ADMIN':
      case 'super-admin':
        return 'Super Administrator';
      case 'COLLECTOR':
      case 'collector':
        return 'Waste Collector';
      case 'RECYCLING_CENTRE':
      case 'recycling-centre':
        return 'Recycling Centre';
      default:
        return role;
    }
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': '#f39c12',
      'received': '#3498db',
      'processing': '#9b59b6',
      'completed': '#27ae60',
      'rejected': '#e74c3c',
      'scheduling': '#2980b9',
      'accepted': '#27ae60'
    };
    return colors[status] || '#95a5a6';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'Pending',
      'received': 'Received',
      'processing': 'Processing',
      'completed': 'Completed',
      'rejected': 'Rejected',
      'scheduling': 'Scheduling',
      'accepted': 'Accepted'
    };
    return labels[status] || status;
  }
}
