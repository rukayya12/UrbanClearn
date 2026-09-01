import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { RewardService } from '../../../core/services/reward.service';
import { UserService } from '../../../core/services/user.service';
import { WasteRequest } from '../../../core/models/request.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  totalRequests = 0;
  pendingRequests = 0;
  completedRequests = 0;
  greenPoints = 0;
  recentRequests: WasteRequest[] = [];

  constructor(
    private authService: AuthService,
    private requestService: RequestService,
    private rewardService: RewardService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    if (!this.currentUser) return;

    // Get user's requests
    const userRequests = this.requestService.getUserRequests(this.currentUser.id);
    this.totalRequests = userRequests.length;
    this.pendingRequests = userRequests.filter(r => 
      ['pending', 'received', 'scheduling'].includes(r.status)
    ).length;
    this.completedRequests = userRequests.filter(r => r.status === 'completed').length;
    this.recentRequests = userRequests.slice(0, 5);

    // Get user's rewards
    const userRewards = this.rewardService.getUserRewards(this.currentUser.id);
    this.greenPoints = userRewards?.totalPoints || 0;
  }

  createNewRequest(): void {
    this.router.navigate(['/user/request']);
  }

  viewAllRequests(): void {
    this.router.navigate(['/user/requests']);
  }

  viewRewards(): void {
    this.router.navigate(['/user/rewards']);
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
