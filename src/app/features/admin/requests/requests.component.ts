import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { WasteRequest } from '../../../core/models/request.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-requests-page">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <span class="eyebrow">ADMIN MANAGEMENT</span>
          <h1>Collection Requests</h1>
          <p class="subtitle">Review, search, filter, and manage all waste collection requests across UrbanClean.</p>
        </div>
        <div class="header-stats">
          <span class="badge-count">{{ filteredRequests.length }} of {{ requests.length }} Requests</span>
        </div>
      </header>

      <!-- Search & Filters Toolbar -->
      <section class="toolbar-section">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()"
            placeholder="Search by Request ID (REQ01), User ID (USER01), name, waste type, location..."
            aria-label="Search requests"
            class="search-input"
          />
          <button *ngIf="searchTerm" (click)="clearSearch()" class="clear-search-btn" title="Clear search">✕</button>
        </div>

        <div class="filter-controls">
          <div class="filter-group">
            <label for="statusFilter">Status:</label>
            <select id="statusFilter" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button *ngIf="searchTerm || statusFilter !== 'all'" (click)="resetFilters()" class="btn-reset-filters">
            Reset Filters
          </button>
        </div>
      </section>

      <!-- Desktop & Tablet Table View -->
      <section class="table-card" *ngIf="filteredRequests.length > 0; else emptyState">
        <div class="table-responsive">
          <table class="requests-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>User ID</th>
                <th>User Name</th>
                <th>Waste Type</th>
                <th>Location</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th class="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let req of filteredRequests">
                <td class="id-cell">
                  <span class="req-id-badge">{{ req.id }}</span>
                </td>
                <td class="user-id-cell">
                  <span class="user-id-badge">{{ req.userId }}</span>
                </td>
                <td class="name-cell">
                  <div class="user-cell">
                    <div class="user-avatar">{{ (req.userName?.charAt(0) || 'U') | uppercase }}</div>
                    <strong>{{ req.userName || 'Normal User' }}</strong>
                  </div>
                </td>
                <td>
                  <div class="waste-tags-container">
                    <span class="waste-pill" *ngFor="let type of req.wasteTypes">
                      {{ type }}
                    </span>
                  </div>
                </td>
                <td class="location-cell">
                  <span class="location-text" [title]="req.location?.address">
                    📍 {{ req.location?.address || 'Zanzibar' }}
                  </span>
                </td>
                <td class="date-cell">{{ req.requestedTime | date:'dd/MM/yyyy' }}</td>
                <td class="time-cell">{{ req.requestedTime | date:'shortTime' }}</td>
                <td>
                  <span class="status-pill" [ngClass]="'status-' + (req.status | lowercase)">
                    {{ getStatusLabel(req.status) }}
                  </span>
                </td>
                <td class="actions-cell">
                  <div class="action-buttons">
                    <button class="btn-action btn-view" (click)="viewRequest(req)" title="View request details">
                      👁️ View
                    </button>
                    
                    <div class="status-dropdown-wrapper">
                      <select 
                        [ngModel]="req.status | lowercase" 
                        (ngModelChange)="onQuickStatusChange(req, $event)"
                        class="status-select-action"
                        title="Change status"
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card List View (Visible on Mobile Screens) -->
        <div class="mobile-cards-list">
          <div class="request-mobile-card" *ngFor="let req of filteredRequests">
            <div class="mobile-card-top">
              <div class="mobile-req-header">
                <div class="header-badges">
                  <span class="req-id-badge">{{ req.id }}</span>
                  <span class="user-id-badge">{{ req.userId }}</span>
                </div>
                <span class="status-pill" [ngClass]="'status-' + (req.status | lowercase)">
                  {{ getStatusLabel(req.status) }}
                </span>
              </div>
            </div>

            <div class="mobile-card-body">
              <div class="mobile-detail-row">
                <span class="lbl">User Name:</span>
                <span class="val font-bold">{{ req.userName || 'Normal User' }}</span>
              </div>
              <div class="mobile-detail-row">
                <span class="lbl">Email:</span>
                <span class="val email-val">{{ req.userEmail || getUserEmail(req.userId) }}</span>
              </div>
              <div class="mobile-detail-row" *ngIf="req.userPhone">
                <span class="lbl">Phone:</span>
                <span class="val">{{ req.userPhone }}</span>
              </div>
              <div class="mobile-detail-row">
                <span class="lbl">Waste Type:</span>
                <div class="waste-tags-container">
                  <span class="waste-pill" *ngFor="let type of req.wasteTypes">
                    {{ type }}
                  </span>
                </div>
              </div>
              <div class="mobile-detail-row">
                <span class="lbl">Location:</span>
                <span class="val">📍 {{ req.location?.address || 'Zanzibar' }}</span>
              </div>
              <div class="mobile-detail-row">
                <span class="lbl">Date & Time:</span>
                <span class="val">{{ req.requestedTime | date:'dd/MM/yyyy' }} at {{ req.requestedTime | date:'shortTime' }}</span>
              </div>
            </div>

            <div class="mobile-card-actions">
              <button class="btn-action btn-view" (click)="viewRequest(req)">
                👁️ View Details
              </button>

              <div class="mobile-status-actions">
                <button 
                  *ngIf="(req.status | lowercase) !== 'accepted'" 
                  class="btn-action btn-accept" 
                  (click)="updateStatus(req, 'accepted')"
                >
                  ✓ Accept
                </button>
                <button 
                  *ngIf="(req.status | lowercase) === 'accepted'" 
                  class="btn-action btn-complete" 
                  (click)="updateStatus(req, 'completed')"
                >
                  🏆 Complete
                </button>
                <button 
                  *ngIf="(req.status | lowercase) !== 'rejected' && (req.status | lowercase) !== 'completed'" 
                  class="btn-action btn-reject" 
                  (click)="updateStatus(req, 'rejected')"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <ng-template #emptyState>
        <div class="empty-state-card">
          <span class="empty-icon">📋</span>
          <h3>No requests found.</h3>
          <p *ngIf="searchTerm || statusFilter !== 'all'">
            No collection requests match your active search and filter criteria.
          </p>
          <p *ngIf="!searchTerm && statusFilter === 'all'">
            No collection requests have been submitted by users yet.
          </p>
          <button *ngIf="searchTerm || statusFilter !== 'all'" class="btn btn-secondary" (click)="resetFilters()">
            Reset Filters
          </button>
        </div>
      </ng-template>

      <!-- View Request Details Modal -->
      <div class="modal-backdrop" *ngIf="selectedRequest" (click)="closeDetails()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <span class="modal-eyebrow">REQUEST DETAILS</span>
              <h2>{{ selectedRequest.id }}</h2>
            </div>
            <button class="modal-close-btn" (click)="closeDetails()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Request ID</span>
                <span class="detail-value font-mono req-id-badge">{{ selectedRequest.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">User ID</span>
                <span class="detail-value font-mono user-id-badge">{{ selectedRequest.userId }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Current Status</span>
                <span class="status-pill" [ngClass]="'status-' + (selectedRequest.status | lowercase)">
                  {{ getStatusLabel(selectedRequest.status) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">User Name</span>
                <span class="detail-value font-bold">{{ selectedRequest.userName || 'Normal User' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email Address</span>
                <span class="detail-value">{{ selectedRequest.userEmail || getUserEmail(selectedRequest.userId) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">{{ selectedRequest.userPhone || 'Not provided' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Scheduled Date</span>
                <span class="detail-value">{{ selectedRequest.requestedTime | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Scheduled Time</span>
                <span class="detail-value">{{ selectedRequest.requestedTime | date:'shortTime' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Waste Types</span>
                <div class="waste-tags-container">
                  <span class="waste-pill" *ngFor="let type of selectedRequest.wasteTypes">
                    {{ type }}
                  </span>
                </div>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Pickup Location</span>
                <span class="detail-value font-bold">📍 {{ selectedRequest.location?.address }}</span>
                <span class="detail-coords" *ngIf="selectedRequest.location?.latitude">
                  (Lat: {{ selectedRequest.location?.latitude }}, Long: {{ selectedRequest.location?.longitude }})
                </span>
              </div>
              <div class="detail-item full-width" *ngIf="selectedRequest.description">
                <span class="detail-label">Description / Instructions</span>
                <div class="description-box">{{ selectedRequest.description }}</div>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Request Date (Submitted)</span>
                <span class="detail-value">{{ selectedRequest.createdAt | date:'medium' }}</span>
              </div>
            </div>

            <!-- Status Action Controller inside Modal -->
            <div class="status-manager-box">
              <label class="detail-label">Change Status:</label>
              <div class="status-buttons-row">
                <button 
                  class="btn-status btn-status-pending" 
                  [class.active-status]="(selectedRequest.status | lowercase) === 'pending'"
                  (click)="updateStatus(selectedRequest, 'pending')"
                >
                  Pending
                </button>
                <button 
                  class="btn-status btn-status-accepted" 
                  [class.active-status]="(selectedRequest.status | lowercase) === 'accepted'"
                  (click)="updateStatus(selectedRequest, 'accepted')"
                >
                  Accepted
                </button>
                <button 
                  class="btn-status btn-status-completed" 
                  [class.active-status]="(selectedRequest.status | lowercase) === 'completed'"
                  (click)="updateStatus(selectedRequest, 'completed')"
                >
                  Completed
                </button>
                <button 
                  class="btn-status btn-status-rejected" 
                  [class.active-status]="(selectedRequest.status | lowercase) === 'rejected'"
                  (click)="updateStatus(selectedRequest, 'rejected')"
                >
                  Rejected
                </button>
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
    .admin-requests-page {
      max-width: 1400px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
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

    .badge-count {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      padding: 6px 14px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 13px;
    }

    /* Toolbar: Search and Filters */
    .toolbar-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 260px;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 14px;
      pointer-events: none;
      opacity: 0.6;
    }

    .search-input {
      width: 100%;
      padding: 10px 36px 10px 36px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .search-input:focus {
      border-color: #15803d;
      box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.12);
    }

    .clear-search-btn {
      position: absolute;
      right: 10px;
      background: #e2e8f0;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 10px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
    }

    .filter-controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-group label {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }

    .filter-select {
      padding: 9px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      background: #ffffff;
      outline: none;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-reset-filters {
      padding: 8px 14px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-reset-filters:hover {
      background: #e2e8f0;
    }

    /* Table Section */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .requests-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }

    .requests-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .requests-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #1e293b;
    }

    .requests-table tr:hover {
      background: #f8fafc;
    }

    .req-id-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 800;
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      display: inline-block;
    }

    .user-id-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 3px 7px;
      border-radius: 5px;
      font-size: 11.5px;
      display: inline-block;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #dcfce7;
      color: #15803d;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .waste-tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .waste-pill {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: capitalize;
    }

    .location-cell {
      max-width: 200px;
    }

    .location-text {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
    }

    .date-cell, .time-cell {
      color: #64748b;
      white-space: nowrap;
      font-size: 12.5px;
    }

    /* Status Pills */
    .status-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .status-pending { background: #fef3c7; color: #92400e; }
    .status-received { background: #e0f2fe; color: #0369a1; }
    .status-scheduling { background: #e0f2fe; color: #0369a1; }
    .status-accepted { background: #dcfce7; color: #166534; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }

    /* Action Buttons */
    .actions-cell {
      white-space: nowrap;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-action {
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-view {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }
    .btn-view:hover { background: #dbeafe; }

    .btn-accept {
      background: #f0fdf4;
      color: #15803d;
      border-color: #bbf7d0;
    }
    .btn-accept:hover { background: #dcfce7; }

    .btn-complete {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }
    .btn-complete:hover { background: #d1fae5; }

    .btn-reject {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fecaca;
    }
    .btn-reject:hover { background: #fee2e2; }

    .status-select-action {
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      cursor: pointer;
      outline: none;
    }

    /* Mobile Cards View */
    .mobile-cards-list {
      display: none;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
    }

    .request-mobile-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .mobile-req-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .mobile-card-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
      margin-bottom: 14px;
    }

    .mobile-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .mobile-detail-row .lbl {
      color: #64748b;
      font-weight: 600;
      font-size: 12px;
      min-width: 80px;
    }

    .mobile-detail-row .val {
      color: #0f172a;
      text-align: right;
    }

    .email-val {
      font-size: 12px;
      word-break: break-all;
    }

    .mobile-card-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
    }

    .mobile-status-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .mobile-status-actions .btn-action {
      flex: 1;
      text-align: center;
    }

    /* Empty State */
    .empty-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-icon {
      font-size: 40px;
      display: block;
      margin-bottom: 12px;
    }

    .empty-state-card h3 {
      margin: 0 0 8px;
      font-size: 18px;
      color: #0f172a;
    }

    .empty-state-card p {
      margin: 0 0 16px;
      color: #64748b;
      font-size: 14px;
    }

    /* Common Button */
    .btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary { background: #15803d; color: #ffffff; }
    .btn-primary:hover { background: #166534; }
    .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #e2e8f0; }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      backdrop-filter: blur(2px);
    }

    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      animation: modalSlideIn 0.2s ease-out;
    }

    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      padding: 18px 22px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-eyebrow {
      font-size: 11px;
      font-weight: 800;
      color: #15803d;
      letter-spacing: 1px;
    }

    .modal-header h2 {
      margin: 4px 0 0;
      font-size: 20px;
      color: #0f172a;
    }

    .modal-close-btn {
      background: transparent;
      border: none;
      font-size: 26px;
      line-height: 1;
      color: #94a3b8;
      cursor: pointer;
    }

    .modal-body {
      padding: 22px;
      overflow-y: auto;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
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

    .detail-coords {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .description-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 13.5px;
      color: #334155;
      white-space: pre-wrap;
    }

    .status-manager-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 14px;
    }

    .status-buttons-row {
      display: flex;
      gap: 8px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .btn-status {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
    }

    .btn-status-pending { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .btn-status-accepted { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
    .btn-status-completed { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
    .btn-status-rejected { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

    .btn-status.active-status {
      box-shadow: 0 0 0 2px #0f172a;
    }

    .modal-footer {
      padding: 16px 22px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .font-bold { font-weight: 700; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, monospace; }

    /* Responsive Breakpoints */
    @media (max-width: 900px) {
      .table-responsive {
        display: none;
      }

      .mobile-cards-list {
        display: flex;
      }
    }

    @media (max-width: 600px) {
      .toolbar-section {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-group {
        justify-content: space-between;
      }

      .filter-select {
        flex: 1;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      .detail-item.full-width {
        grid-column: span 1;
      }

      .status-buttons-row {
        flex-direction: column;
      }

      .btn-status {
        width: 100%;
        text-align: center;
      }
    }
  `]
})
export class RequestsComponent implements OnInit, OnDestroy {
  requests: WasteRequest[] = [];
  filteredRequests: WasteRequest[] = [];
  searchTerm = '';
  statusFilter = 'all';
  selectedRequest: WasteRequest | null = null;
  usersMap: Map<string, User> = new Map();
  private subscriptions = new Subscription();

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadUsersMap();
    this.loadRequests();

    this.subscriptions.add(
      this.requestService.requests$.subscribe(() => {
        this.loadRequests();
      })
    );

    this.subscriptions.add(
      this.userService.users$.subscribe(() => {
        this.loadUsersMap();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadUsersMap(): void {
    const users = this.userService.getAllUsers();
    this.usersMap.clear();
    for (const u of users) {
      this.usersMap.set(u.id, u);
    }
  }

  getUserEmail(userId: string): string {
    const user = this.usersMap.get(userId);
    return user ? user.email : 'N/A';
  }

  loadRequests(): void {
    this.requests = this.requestService.getAllRequests();
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredRequests = this.requests.filter(req => {
      // 1. Search term match (Request ID, User ID, User Name, Waste Type, Location)
      const userEmail = req.userEmail || this.getUserEmail(req.userId) || '';
      const wasteTypesText = (req.wasteTypes || []).join(' ').toLowerCase();
      const locationText = (req.location?.address || '').toLowerCase();

      const matchesSearch = !term || (
        (req.id && req.id.toLowerCase().includes(term)) ||
        (req.userId && req.userId.toLowerCase().includes(term)) ||
        (req.userName && req.userName.toLowerCase().includes(term)) ||
        (userEmail && userEmail.toLowerCase().includes(term)) ||
        wasteTypesText.includes(term) ||
        locationText.includes(term)
      );

      // 2. Status filter
      const reqStatus = (req.status || '').toLowerCase();
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'pending' && (reqStatus === 'pending' || reqStatus === 'received' || reqStatus === 'scheduling')) ||
        (this.statusFilter === 'accepted' && reqStatus === 'accepted') ||
        (this.statusFilter === 'completed' && reqStatus === 'completed') ||
        (this.statusFilter === 'rejected' && reqStatus === 'rejected');

      return matchesSearch && matchesStatus;
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.applyFilters();
  }

  viewRequest(request: WasteRequest): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
  }

  updateStatus(request: WasteRequest, newStatus: string): void {
    const success = this.requestService.changeStatus(request.id, newStatus);
    if (success) {
      this.loadRequests();
      if (this.selectedRequest && this.selectedRequest.id === request.id) {
        this.selectedRequest = this.requestService.getRequestById(request.id) || null;
      }
    }
  }

  onQuickStatusChange(request: WasteRequest, newStatus: string): void {
    if (newStatus && newStatus !== (request.status || '').toLowerCase()) {
      this.updateStatus(request, newStatus);
    }
  }

  getStatusLabel(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending': return 'Pending';
      case 'received':
      case 'scheduling': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return status || 'Pending';
    }
  }
}
