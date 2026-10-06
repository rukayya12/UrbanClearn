import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { WasteRequest, RequestStatus } from '../../../core/models/request.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="requests-page">
      <header class="page-header">
        <div>
          <h1>My Requests</h1>
          <p class="subtitle">Track and view the details of your waste collection requests</p>
        </div>
        <button class="btn btn-primary" (click)="createNewRequest()">
          <span class="icon">+</span> New Request
        </button>
      </header>

      <!-- Filter bar -->
      <div class="filters-bar">
        <div class="status-filters">
          <button 
            *ngFor="let tab of filterTabs" 
            class="filter-tab" 
            [class.active]="selectedTab === tab.id"
            (click)="setFilterTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="search-box">
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search by Request ID (e.g. REQ01)..." 
            (ngModelChange)="applyFilter()"
          />
        </div>
      </div>

      <!-- Requests Table -->
      <div class="table-container" *ngIf="filteredRequests.length > 0; else emptyState">
        <table class="requests-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Waste Type</th>
              <th>Address</th>
              <th>Preferred Date / Time</th>
              <th>Confirmed Collection</th>
              <th>Collector</th>
              <th>Status</th>
              <th>Eco Points</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let req of filteredRequests">
              <td class="req-id-cell">
                <span class="badge-req-id">{{ req.id }}</span>
              </td>
              <td>
                <span class="waste-type-tag" *ngFor="let type of req.wasteTypes">{{ type }}</span>
              </td>
              <td class="address-cell">{{ req.location?.address || 'N/A' }}</td>
              <td>{{ req.preferredDate ? (req.preferredDate | date:'mediumDate') : 'No preference' }}<br />{{ req.preferredTime || '' }}</td>
              <td *ngIf="req.confirmedCollectionDate; else awaitingSchedule">{{ req.confirmedCollectionDate | date:'mediumDate' }} {{ req.confirmedCollectionTime }}</td>
              <ng-template #awaitingSchedule><td>Not scheduled</td></ng-template>
              <td>{{ req.collectorName || 'Not assigned' }}</td>
              <td>
                <span class="status-badge" [style.background-color]="getStatusColor(req.status)">
                  {{ getStatusLabel(req.status) }}
                </span>
              </td>
              <td class="points-cell">{{ req.greenPoints || 0 }} pts</td>
              <td>
                <button class="btn-details" (click)="openDetails(req)">View Details</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No requests found</h3>
          <p *ngIf="userRequests.length === 0">You haven't submitted any waste collection requests yet.</p>
          <p *ngIf="userRequests.length > 0">No requests match your selected filters.</p>
          <button class="btn btn-primary" (click)="createNewRequest()">Create Your First Request</button>
        </div>
      </ng-template>

      <!-- Request Details Modal -->
      <div class="modal-backdrop" *ngIf="selectedRequest" (click)="closeDetails()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <span class="modal-eyebrow">REQUEST DETAILS</span>
              <h2>Request ID: <span class="highlight-id">{{ selectedRequest.id }}</span></h2>
            </div>
            <button class="modal-close" (click)="closeDetails()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Request ID</span>
                <span class="detail-value id-value">{{ selectedRequest.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status</span>
                <span class="status-badge" [style.background-color]="getStatusColor(selectedRequest.status)">
                  {{ getStatusLabel(selectedRequest.status) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Waste Types</span>
                <div class="waste-tags-group">
                  <span class="waste-type-tag" *ngFor="let type of selectedRequest.wasteTypes">{{ type }}</span>
                </div>
              </div>
              <div class="detail-item">
                <span class="detail-label">Preferred Date / Time</span>
                <span class="detail-value">{{ selectedRequest.preferredDate ? (selectedRequest.preferredDate | date:'mediumDate') : 'No preference' }} {{ selectedRequest.preferredTime || '' }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedRequest.proposedCollectionDate">
                <span class="detail-label">Collector Proposal</span>
                <span class="detail-value">{{ selectedRequest.proposedCollectionDate | date:'mediumDate' }} at {{ selectedRequest.proposedCollectionTime }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedRequest.confirmedCollectionDate">
                <span class="detail-label">Confirmed Collection</span>
                <span class="detail-value">{{ selectedRequest.confirmedCollectionDate | date:'mediumDate' }} at {{ selectedRequest.confirmedCollectionTime }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Pickup Location</span>
                <span class="detail-value">{{ selectedRequest.location?.address }} (Lat: {{ selectedRequest.location?.latitude }}, Long: {{ selectedRequest.location?.longitude }})</span>
              </div>
              <div class="detail-item full-width" *ngIf="selectedRequest.description">
                <span class="detail-label">Description / Instructions</span>
                <span class="detail-value">{{ selectedRequest.description }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedRequest.collectorName">
                <span class="detail-label">Assigned Collector</span>
                <span class="detail-value font-bold">{{ selectedRequest.collectorName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Eco Points</span>
                <span class="detail-value font-bold" style="color: #16a085;">{{ selectedRequest.greenPoints || 0 }} Eco Points</span>
              </div>
            </div>

            <!-- Status History / Timeline -->
            <div class="timeline-section" *ngIf="selectedRequest.statusHistory?.length">
              <h3>Status Timeline</h3>
              <div class="timeline-list">
                <div class="timeline-item" *ngFor="let item of selectedRequest.statusHistory">
                  <div class="timeline-dot" [style.background-color]="getStatusColor(item.status)"></div>
                  <div class="timeline-info">
                    <strong>{{ getStatusLabel(item.status) }}</strong>
                    <span class="timeline-date">{{ item.timestamp | date:'medium' }}</span>
                    <p *ngIf="item.notes" class="timeline-notes">{{ item.notes }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDetails()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .requests-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .page-header h1 {
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
    .btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #16a34a;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #15803d;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }
    .status-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-tab {
      padding: 8px 14px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .filter-tab.active {
      background: #16a34a;
      border-color: #16a34a;
      color: #ffffff;
    }
    .search-box input {
      padding: 8px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      width: 260px;
      font-size: 13px;
    }
    .table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .requests-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }
    .requests-table th {
      background: #f8fafc;
      padding: 12px 16px;
      color: #475569;
      font-weight: 700;
      border-bottom: 1px solid #e2e8f0;
    }
    .requests-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .badge-req-id {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    .waste-type-tag {
      display: inline-block;
      background: #f1f5f9;
      color: #334155;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 4px;
      text-transform: capitalize;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      color: #ffffff;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .btn-details {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-details:hover {
      background: #e2e8f0;
    }
    .empty-state {
      padding: 48px;
      text-align: center;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      margin-top: 20px;
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    /* Modal styles */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .modal-content {
      background: #ffffff;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-eyebrow {
      font-size: 11px;
      font-weight: 800;
      color: #16a34a;
      letter-spacing: 1.5px;
    }
    .modal-header h2 {
      margin: 4px 0 0;
      font-size: 20px;
      color: #0f172a;
    }
    .highlight-id {
      color: #16a34a;
      font-weight: 800;
    }
    .modal-close {
      background: transparent;
      border: none;
      font-size: 28px;
      line-height: 1;
      color: #94a3b8;
      cursor: pointer;
    }
    .modal-body {
      padding: 24px;
      overflow-y: auto;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .detail-item.full-width {
      grid-column: span 2;
    }
    .detail-label {
      display: block;
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .detail-value {
      font-size: 14px;
      color: #0f172a;
    }
    .id-value {
      font-weight: 800;
      color: #16a34a;
    }
    .timeline-section h3 {
      font-size: 16px;
      margin: 0 0 16px;
      color: #0f172a;
    }
    .timeline-list {
      border-left: 2px solid #e2e8f0;
      margin-left: 8px;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .timeline-item {
      position: relative;
    }
    .timeline-dot {
      position: absolute;
      left: -22px;
      top: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .timeline-info strong {
      display: block;
      font-size: 14px;
      color: #0f172a;
    }
    .timeline-date {
      font-size: 12px;
      color: #64748b;
    }
    .timeline-notes {
      margin: 4px 0 0;
      font-size: 13px;
      color: #475569;
    }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class RequestsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userRequests: WasteRequest[] = [];
  filteredRequests: WasteRequest[] = [];
  selectedRequest: WasteRequest | null = null;
  selectedTab = 'all';
  searchQuery = '';
  private subscriptions = new Subscription();

  filterTabs = [
    { id: 'all', label: 'All Requests' },
    { id: 'pending', label: 'Pending' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'time-proposed', label: 'Time Proposed' },
    { id: 'reschedule-required', label: 'Reschedule Required' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'on-the-way', label: 'On the Way' },
    { id: 'collected', label: 'Collected' },
    { id: 'completed', label: 'Completed' }
  ];

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadUserRequests();

    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.loadUserRequests();
      })
    );

    this.subscriptions.add(
      this.requestService.requests$.subscribe(() => {
        this.loadUserRequests();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadUserRequests(): void {
    if (!this.currentUser) {
      this.userRequests = [];
      this.filteredRequests = [];
      return;
    }
    this.userRequests = this.requestService.getUserRequests(this.currentUser.id);
    this.applyFilter();
  }

  setFilterTab(tabId: string): void {
    this.selectedTab = tabId;
    this.applyFilter();
  }

  applyFilter(): void {
    let result = [...this.userRequests];

    if (this.selectedTab !== 'all') {
      result = result.filter(r => r.status === this.selectedTab);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(r =>
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.location?.address && r.location.address.toLowerCase().includes(q)) ||
        (r.wasteTypes && r.wasteTypes.some(t => t.toLowerCase().includes(q)))
      );
    }

    this.filteredRequests = result;
  }

  openDetails(request: WasteRequest): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
  }

  createNewRequest(): void {
    this.router.navigate(['/user/request']);
  }

  getStatusColor(status: RequestStatus | string): string {
    const colors: { [key: string]: string } = {
      'pending': '#f39c12',
      'assigned': '#2563eb',
      'time-proposed': '#0369a1',
      'reschedule-required': '#b45309',
      'scheduled': '#15803d',
      'on-the-way': '#0f766e',
      'collected': '#0f766e',
      'received': '#3498db',
      'processing': '#9b59b6',
      'completed': '#27ae60',
      'rejected': '#e74c3c',
      'scheduling': '#2980b9',
      'accepted': '#27ae60'
    };
    return colors[status] || '#95a5a6';
  }

  getStatusLabel(status: RequestStatus | string): string {
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
