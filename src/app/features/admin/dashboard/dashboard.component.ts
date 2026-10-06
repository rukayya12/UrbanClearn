import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { WasteRequest } from '../../../core/models/request.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="admin-dashboard-page">
      <!-- Admin Profile & Welcome Header -->
      <header class="dashboard-header">
        <div class="header-left">
          <span class="eyebrow">ADMIN PORTAL</span>
          <h1>Admin Dashboard</h1>
          <p class="subtitle">Real-time overview of users, collection requests, and platform activity.</p>
        </div>

        <div class="admin-profile-card" *ngIf="currentAdmin">
          <div class="admin-avatar">
            {{ (currentAdmin.fullName?.charAt(0) || 'A') | uppercase }}
          </div>
          <div class="admin-meta">
            <span class="admin-name">{{ currentAdmin.fullName || 'Admin User' }}</span>
            <span class="admin-email">{{ currentAdmin.email }}</span>
            <span class="admin-role-badge">{{ currentAdmin.role }}</span>
          </div>
        </div>
      </header>

      <!-- Quick Nav Action Buttons -->
      <div class="header-actions">
        <a routerLink="/admin/users" class="btn btn-primary">
          <span class="btn-icon">👥</span> Manage Users
        </a>
        <a routerLink="/admin/requests" class="btn btn-secondary">
          <span class="btn-icon">📋</span> View Requests
        </a>
      </div>

      <!-- 6 Summary Stat Cards -->
      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon users-icon">👥</div>
          <div class="stat-info">
            <span class="stat-label">Total Users</span>
            <span class="stat-value">{{ totalUsers }}</span>
            <span class="stat-sub">From registered accounts</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon active-icon">✅</div>
          <div class="stat-info">
            <span class="stat-label">Active Users</span>
            <span class="stat-value active-color">{{ activeUsers }}</span>
            <span class="stat-sub">Active accounts</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon inactive-icon">⏸️</div>
          <div class="stat-info">
            <span class="stat-label">Inactive Users</span>
            <span class="stat-value inactive-color">{{ inactiveUsers }}</span>
            <span class="stat-sub">Deactivated accounts</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon requests-icon">📋</div>
          <div class="stat-info">
            <span class="stat-label">Total Requests</span>
            <span class="stat-value">{{ totalWasteRequests }}</span>
            <span class="stat-sub">All logged requests</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon pending-icon">⏳</div>
          <div class="stat-info">
            <span class="stat-label">Pending Requests</span>
            <span class="stat-value pending-color">{{ pendingRequests }}</span>
            <span class="stat-sub">Awaiting collection</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon completed-icon">🏆</div>
          <div class="stat-info">
            <span class="stat-label">Completed Requests</span>
            <span class="stat-value completed-color">{{ completedRequests }}</span>
            <span class="stat-sub">Successfully collected</span>
          </div>
        </div>
      </section>

      <!-- Split Grid: Recent Users & Recent Requests -->
      <div class="dashboard-tables-grid">
        <!-- Recent Users Section -->
        <section class="dashboard-section recent-users-section">
          <div class="section-header">
            <div>
              <h2>Recent Users</h2>
              <p class="section-subtitle">Recently registered normal users</p>
            </div>
            <a routerLink="/admin/users" class="view-all-link">View All Users →</a>
          </div>

          <div class="table-container" *ngIf="recentUsers.length > 0; else noUsers">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Registration Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of recentUsers">
                  <td>
                    <div class="user-cell">
                      <div class="user-mini-avatar">{{ u.fullName?.charAt(0) || 'U' }}</div>
                      <strong>{{ u.fullName }}</strong>
                    </div>
                  </td>
                  <td class="email-cell">{{ u.email }}</td>
                  <td class="date-cell">{{ u.createdAt | date:'mediumDate' }}</td>
                  <td>
                    <span class="status-badge" [class.active-badge]="u.isActive" [class.inactive-badge]="!u.isActive">
                      {{ u.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <ng-template #noUsers>
            <div class="empty-state">
              <span class="empty-icon">👥</span>
              <p>No registered users found yet.</p>
            </div>
          </ng-template>
        </section>

        <!-- Recent Requests Section -->
        <section class="dashboard-section recent-requests-section">
          <div class="section-header">
            <div>
              <h2>Recent Requests</h2>
              <p class="section-subtitle">Latest waste collection submissions</p>
            </div>
            <a routerLink="/admin/requests" class="view-all-link">View All Requests →</a>
          </div>

          <div class="table-container" *ngIf="recentRequests.length > 0; else noRequests">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>User</th>
                  <th>Waste Type</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let req of recentRequests">
                  <td>
                    <span class="badge-req-id">{{ req.id }}</span>
                  </td>
                  <td class="user-name-cell">
                    <strong>{{ req.userName || 'Resident' }}</strong>
                  </td>
                  <td class="waste-type-cell">
                    <span class="waste-tag" *ngFor="let type of req.wasteTypes">{{ type }}</span>
                  </td>
                  <td class="location-cell">{{ req.location?.address || 'N/A' }}</td>
                  <td>
                    <span class="req-status-badge" [style.background-color]="getStatusColor(req.status)">
                      {{ getStatusLabel(req.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <ng-template #noRequests>
            <div class="empty-state">
              <span class="empty-icon">📭</span>
              <p>No collection requests yet.</p>
            </div>
          </ng-template>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard-page {
      max-width: 1350px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .eyebrow {
      font-size: 11px;
      font-weight: 800;
      color: #15803d;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }

    h1 {
      margin: 0;
      color: #0f172a;
      font-size: 28px;
      font-weight: 800;
    }

    .subtitle {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .admin-profile-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #ffffff;
      border: 1px solid #dcfce7;
      padding: 10px 16px;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .admin-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #15803d;
      color: #ffffff;
      font-weight: 800;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .admin-meta {
      display: flex;
      flex-direction: column;
    }

    .admin-name {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
    }

    .admin-email {
      font-size: 12px;
      color: #64748b;
    }

    .admin-role-badge {
      display: inline-block;
      align-self: flex-start;
      margin-top: 2px;
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      font-size: 10px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 18px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      min-height: 42px;
    }

    .btn-primary {
      background: #15803d;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #166534;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #ffffff;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .btn-secondary:hover {
      background: #f0fdf4;
      transform: translateY(-1px);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .users-icon { background: #f0fdf4; color: #15803d; }
    .active-icon { background: #ecfdf5; color: #059669; }
    .inactive-icon { background: #fef2f2; color: #dc2626; }
    .requests-icon { background: #eff6ff; color: #2563eb; }
    .pending-icon { background: #fffbeb; color: #d97706; }
    .completed-icon { background: #f0fdf4; color: #16a34a; }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }

    .stat-value {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin: 2px 0;
    }

    .active-color { color: #059669; }
    .inactive-color { color: #dc2626; }
    .pending-color { color: #d97706; }
    .completed-color { color: #16a34a; }

    .stat-sub {
      font-size: 11px;
      color: #94a3b8;
    }

    .dashboard-tables-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .dashboard-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 22px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .section-subtitle {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 13px;
    }

    .view-all-link {
      color: #15803d;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      transition: color 0.2s;
    }

    .view-all-link:hover {
      color: #166534;
      text-decoration: underline;
    }

    .table-container {
      overflow-x: auto;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
      white-space: nowrap;
    }

    .data-table th {
      background: #f8fafc;
      padding: 12px 14px;
      color: #475569;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-mini-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #334155;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .badge-req-id {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 12px;
      letter-spacing: 0.5px;
    }

    .waste-tag {
      display: inline-block;
      background: #f1f5f9;
      color: #334155;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      margin-right: 4px;
      text-transform: capitalize;
    }

    .status-badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }

    .active-badge {
      background: #dcfce7;
      color: #166534;
    }

    .inactive-badge {
      background: #fee2e2;
      color: #991b1b;
    }

    .req-status-badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 9999px;
      color: #ffffff;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .empty-state {
      padding: 36px 16px;
      text-align: center;
      color: #64748b;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
    }

    .empty-icon {
      font-size: 36px;
      display: block;
      margin-bottom: 8px;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }

    @media (max-width: 640px) {
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .admin-profile-card {
        width: 100%;
        box-sizing: border-box;
      }

      .header-actions {
        width: 100%;
      }

      .header-actions .btn {
        flex: 1;
        justify-content: center;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentAdmin: User | null = null;
  totalUsers = 0;
  activeUsers = 0;
  inactiveUsers = 0;
  totalWasteRequests = 0;
  pendingRequests = 0;
  acceptedRequests = 0;
  completedRequests = 0;
  rejectedRequests = 0;
  recentUsers: User[] = [];
  recentRequests: WasteRequest[] = [];
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.currentAdmin = this.authService.getCurrentUser();
    this.loadData();

    // Subscribe to auth session changes
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentAdmin = user;
        this.loadData();
      })
    );

    // Subscribe to user list changes
    this.subscriptions.add(
      this.userService.users$.subscribe(() => {
        this.loadData();
      })
    );

    // Subscribe to request changes
    this.subscriptions.add(
      this.requestService.requests$.subscribe(() => {
        this.loadData();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadData(): void {
    // Normal users data from storage
    const allUsers = this.userService.getAllUsers();
    const normalUsers = allUsers.filter(u => u.role === 'NORMAL_USER');
    this.totalUsers = normalUsers.length;
    this.activeUsers = normalUsers.filter(u => u.isActive).length;
    this.inactiveUsers = normalUsers.filter(u => !u.isActive).length;
    this.recentUsers = normalUsers.slice(0, 5);

    // Requests data from storage
    const requests = this.requestService.getAllRequests();
    this.totalWasteRequests = requests.length;
    this.pendingRequests = requests.filter(r => ['pending', 'received'].includes(r.status?.toLowerCase())).length;
    this.acceptedRequests = requests.filter(r => ['assigned', 'time-proposed', 'reschedule-required', 'scheduled', 'on-the-way', 'collected', 'accepted', 'scheduling', 'processed'].includes(r.status?.toLowerCase())).length;
    this.completedRequests = requests.filter(r => r.status?.toLowerCase() === 'completed').length;
    this.rejectedRequests = requests.filter(r => r.status?.toLowerCase() === 'rejected').length;
    this.recentRequests = requests.slice(0, 5);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': '#f59e0b',
      'assigned': '#2563eb',
      'time-proposed': '#0284c7',
      'reschedule-required': '#b45309',
      'scheduled': '#15803d',
      'on-the-way': '#0f766e',
      'collected': '#0f766e',
      'received': '#3b82f6',
      'processing': '#8b5cf6',
      'completed': '#10b981',
      'rejected': '#ef4444',
      'scheduling': '#0ea5e9',
      'accepted': '#10b981'
    };
    return colors[status] || '#94a3b8';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'Pending',
      'assigned': 'Assigned',
      'time-proposed': 'Time Proposed',
      'reschedule-required': 'Reschedule Required',
      'scheduled': 'Scheduled',
      'on-the-way': 'On the Way',
      'collected': 'Collected',
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
