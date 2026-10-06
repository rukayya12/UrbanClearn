import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-users-page">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <span class="eyebrow">ADMIN DIRECTORY</span>
          <h1>User Management</h1>
          <p class="subtitle">View, search, filter, and manage registered UrbanClean users.</p>
        </div>
        <div class="header-stats">
          <span class="badge-count">{{ filteredUsers.length }} of {{ users.length }} Users</span>
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
            placeholder="Search by name, email, phone, or location..."
            aria-label="Search users"
            class="search-input"
          />
          <button *ngIf="searchTerm" (click)="clearSearch()" class="clear-search-btn" title="Clear search">✕</button>
        </div>

        <div class="filter-controls">
          <div class="filter-group">
            <label for="statusFilter">Status:</label>
            <select id="statusFilter" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="roleFilter">Role:</label>
            <select id="roleFilter" [(ngModel)]="roleFilter" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="all">All Roles</option>
              <option value="NORMAL_USER">Normal Users</option>
              <option value="ADMIN">Admins</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Desktop & Tablet Table View -->
      <section class="table-card" *ngIf="filteredUsers.length > 0; else emptyState">
        <div class="table-responsive">
          <table class="users-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registration Date</th>
                <th class="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers">
                <td class="id-cell">
                  <span class="user-id-badge">{{ user.id }}</span>
                </td>
                <td>
                  <div class="user-info-cell">
                    <div class="user-avatar">{{ user.fullName?.charAt(0) || 'U' }}</div>
                    <div>
                      <strong>{{ user.fullName }}</strong>
                      <span *ngIf="user.username" class="user-handle">&#64;{{ user.username }}</span>
                    </div>
                  </div>
                </td>
                <td class="email-cell">{{ user.email }}</td>
                <td class="phone-cell">{{ user.phone || 'N/A' }}</td>
                <td class="location-cell">{{ user.location?.address || user.location?.city || 'Zanzibar' }}</td>
                <td>
                  <span class="role-badge" [class.admin-role]="user.role === 'ADMIN'">
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <span class="status-pill" [class.active-pill]="user.isActive" [class.inactive-pill]="!user.isActive">
                    {{ user.isActive ? 'ACTIVE' : 'INACTIVE' }}
                  </span>
                </td>
                <td class="date-cell">{{ user.createdAt | date:'mediumDate' }}</td>
                <td class="actions-cell">
                  <div class="action-buttons">
                    <button class="btn-action btn-view" (click)="viewUser(user)" title="View user details">
                      👁️ View
                    </button>
                    <button class="btn-action btn-edit" (click)="openEdit(user)" title="Edit user">
                      ✏️ Edit
                    </button>
                    <button
                      class="btn-action"
                      [class.btn-deactivate]="user.isActive"
                      [class.btn-activate]="!user.isActive"
                      (click)="toggleUserStatus(user)"
                      [disabled]="isCurrentAdmin(user)"
                      [title]="user.isActive ? 'Deactivate user' : 'Activate user'"
                    >
                      {{ user.isActive ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button
                      class="btn-action btn-delete"
                      (click)="deleteUser(user)"
                      [disabled]="isCurrentAdmin(user)"
                      title="Delete user"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card List View (Visible on Mobile) -->
        <div class="mobile-cards-list">
          <div class="user-mobile-card" *ngFor="let user of filteredUsers">
            <div class="mobile-card-top">
              <div class="user-info-cell">
                <div class="user-avatar">{{ user.fullName?.charAt(0) || 'U' }}</div>
                <div>
                  <strong>{{ user.fullName }}</strong>
                  <span class="mobile-user-email">{{ user.email }}</span>
                </div>
              </div>
              <span class="status-pill" [class.active-pill]="user.isActive" [class.inactive-pill]="!user.isActive">
                {{ user.isActive ? 'ACTIVE' : 'INACTIVE' }}
              </span>
            </div>

            <div class="mobile-card-body">
              <div class="mobile-detail-row">
                <span class="lbl">ID:</span>
                <span class="val user-id-badge">{{ user.id }}</span>
              </div>
              <div class="mobile-detail-row">
                <span class="lbl">Phone:</span>
                <span class="val">{{ user.phone || 'N/A' }}</span>
              </div>
              <div class="mobile-detail-row">
                <span class="lbl">Location:</span>
                <span class="val">{{ user.location?.address || user.location?.city || 'Zanzibar' }}</span>
              </div>
              <div class="mobile-detail-row">
                <span class="lbl">Role:</span>
                <span class="role-badge" [class.admin-role]="user.role === 'ADMIN'">{{ user.role }}</span>
              </div>
              <div class="mobile-detail-row">
                <span class="lbl">Registered:</span>
                <span class="val">{{ user.createdAt | date:'mediumDate' }}</span>
              </div>
            </div>

            <div class="mobile-card-actions">
              <button class="btn-action btn-view" (click)="viewUser(user)">👁️ View</button>
              <button class="btn-action btn-edit" (click)="openEdit(user)">✏️ Edit</button>
              <button
                class="btn-action"
                [class.btn-deactivate]="user.isActive"
                [class.btn-activate]="!user.isActive"
                (click)="toggleUserStatus(user)"
                [disabled]="isCurrentAdmin(user)"
              >
                {{ user.isActive ? 'Deactivate' : 'Activate' }}
              </button>
              <button
                class="btn-action btn-delete"
                (click)="deleteUser(user)"
                [disabled]="isCurrentAdmin(user)"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <ng-template #emptyState>
        <div class="empty-state-card">
          <span class="empty-icon">👥</span>
          <h3>No users found.</h3>
          <p *ngIf="searchTerm || statusFilter !== 'all' || roleFilter !== 'all'">
            No users match your active search and filter criteria.
          </p>
          <p *ngIf="!searchTerm && statusFilter === 'all' && roleFilter === 'all'">
            No registered users in the system yet.
          </p>
          <button *ngIf="searchTerm || statusFilter !== 'all' || roleFilter !== 'all'" class="btn btn-secondary" (click)="resetFilters()">
            Reset Filters
          </button>
        </div>
      </ng-template>

      <!-- View User Details Modal -->
      <div class="modal-backdrop" *ngIf="selectedUser" (click)="closeDetails()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <span class="modal-eyebrow">USER DETAILS</span>
              <h2>{{ selectedUser.fullName }}</h2>
            </div>
            <button class="modal-close-btn" (click)="closeDetails()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">User ID</span>
                <span class="detail-value font-mono">{{ selectedUser.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Role</span>
                <span class="role-badge" [class.admin-role]="selectedUser.role === 'ADMIN'">{{ selectedUser.role }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Full Name</span>
                <span class="detail-value font-bold">{{ selectedUser.fullName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Account Status</span>
                <span class="status-pill" [class.active-pill]="selectedUser.isActive" [class.inactive-pill]="!selectedUser.isActive">
                  {{ selectedUser.isActive ? 'ACTIVE' : 'INACTIVE' }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email Address</span>
                <span class="detail-value">{{ selectedUser.email }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">{{ selectedUser.phone || 'Not provided' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Address / Area</span>
                <span class="detail-value">{{ selectedUser.location?.address || 'Not specified' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">City / District</span>
                <span class="detail-value">{{ selectedUser.location?.city || 'Stone Town' }} / {{ selectedUser.location?.district || 'Zanzibar' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Region</span>
                <span class="detail-value">{{ selectedUser.location?.region || 'Zanzibar' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Registration Date</span>
                <span class="detail-value">{{ selectedUser.createdAt | date:'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Last Login</span>
                <span class="detail-value">{{ selectedUser.lastLogin ? (selectedUser.lastLogin | date:'medium') : 'Never' }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDetails()">Close</button>
            <button class="btn btn-primary" (click)="openEdit(selectedUser); closeDetails()">✏️ Edit User</button>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div class="modal-backdrop" *ngIf="editingUser" (click)="closeEdit()">
        <form class="modal-card" (ngSubmit)="saveUserEdit()" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <span class="modal-eyebrow">EDIT USER</span>
              <h2>Update User Profile</h2>
            </div>
            <button type="button" class="modal-close-btn" (click)="closeEdit()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full-width">
                <label for="editFullName">Full Name *</label>
                <input
                  id="editFullName"
                  type="text"
                  [(ngModel)]="editingUser.fullName"
                  name="fullName"
                  required
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="editPhone">Phone Number *</label>
                <input
                  id="editPhone"
                  type="tel"
                  [(ngModel)]="editingUser.phone"
                  name="phone"
                  required
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="editStatus">Status *</label>
                <select
                  id="editStatus"
                  [(ngModel)]="editingUser.isActive"
                  name="isActive"
                  class="form-control"
                  [disabled]="isCurrentAdmin(editingUser)"
                >
                  <option [ngValue]="true">ACTIVE</option>
                  <option [ngValue]="false">INACTIVE</option>
                </select>
              </div>

              <div class="form-group full-width">
                <label for="editAddress">Address / Location *</label>
                <input
                  id="editAddress"
                  type="text"
                  [(ngModel)]="editingUser.location.address"
                  name="address"
                  required
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="editCity">City</label>
                <input
                  id="editCity"
                  type="text"
                  [(ngModel)]="editingUser.location.city"
                  name="city"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="editDistrict">District</label>
                <input
                  id="editDistrict"
                  type="text"
                  [(ngModel)]="editingUser.location.district"
                  name="district"
                  class="form-control"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeEdit()">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .admin-users-page {
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
      min-width: 280px;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      font-size: 16px;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 36px 10px 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
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
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }

    .filter-controls {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
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
      padding: 9px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      font-size: 13px;
      font-weight: 500;
      color: #0f172a;
      outline: none;
      cursor: pointer;
      min-height: 40px;
    }

    .filter-select:focus {
      border-color: #15803d;
    }

    /* Table Container */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
      white-space: nowrap;
    }

    .users-table th {
      background: #f8fafc;
      padding: 14px 16px;
      color: #475569;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }

    .users-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    .users-table tr:hover {
      background: #f8fafc;
    }

    .user-id-badge {
      background: #f1f5f9;
      color: #475569;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
    }

    .user-info-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #15803d;
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-handle {
      display: block;
      font-size: 11px;
      color: #94a3b8;
    }

    .role-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .role-badge.admin-role {
      background: #eff6ff;
      color: #2563eb;
      border-color: #bfdbfe;
    }

    .status-pill {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .active-pill {
      background: #dcfce7;
      color: #166534;
    }

    .inactive-pill {
      background: #fee2e2;
      color: #991b1b;
    }

    .actions-cell {
      text-align: right;
    }

    .action-buttons {
      display: inline-flex;
      gap: 6px;
    }

    .btn-action {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      min-height: 32px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .btn-view {
      background: #f1f5f9;
      color: #0f172a;
      border-color: #cbd5e1;
    }
    .btn-view:hover { background: #e2e8f0; }

    .btn-edit {
      background: #f0fdf4;
      color: #15803d;
      border-color: #bbf7d0;
    }
    .btn-edit:hover { background: #dcfce7; }

    .btn-deactivate {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }
    .btn-deactivate:hover:not(:disabled) { background: #fee2e2; }

    .btn-activate {
      background: #ecfdf5;
      color: #059669;
      border-color: #a7f3d0;
    }
    .btn-activate:hover:not(:disabled) { background: #d1fae5; }

    .btn-delete {
      background: #fff;
      color: #b91c1c;
      border-color: #fca5a5;
    }
    .btn-delete:hover:not(:disabled) { background: #fee2e2; }

    .btn-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Mobile Cards View (Hidden on Desktop) */
    .mobile-cards-list {
      display: none;
      padding: 12px;
      gap: 12px;
      flex-direction: column;
    }

    .user-mobile-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .mobile-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
    }

    .mobile-user-email {
      display: block;
      font-size: 12px;
      color: #64748b;
    }

    .mobile-card-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
      font-size: 13px;
    }

    .mobile-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mobile-detail-row .lbl {
      color: #64748b;
      font-size: 12px;
      font-weight: 500;
    }

    .mobile-detail-row .val {
      font-weight: 600;
      color: #0f172a;
    }

    .mobile-card-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
    }

    .mobile-card-actions .btn-action {
      justify-content: center;
      min-height: 38px;
    }

    /* Empty State */
    .empty-state-card {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
      color: #64748b;
    }

    .empty-icon {
      font-size: 44px;
      display: block;
      margin-bottom: 12px;
    }

    .empty-state-card h3 {
      margin: 0 0 6px;
      color: #0f172a;
      font-size: 18px;
    }

    .empty-state-card p {
      margin: 0 0 16px;
      font-size: 14px;
    }

    /* Common Buttons */
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

    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 12px; }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group.full-width {
      grid-column: span 2;
    }

    .form-group label {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
    }

    .form-control {
      padding: 9px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      border-color: #15803d;
    }

    .modal-footer {
      padding: 16px 22px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

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

      .details-grid,
      .form-grid {
        grid-template-columns: 1fr;
      }

      .detail-item.full-width,
      .form-group.full-width {
        grid-column: span 1;
      }
    }
  `]
})
export class UsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm = '';
  statusFilter = 'all';
  roleFilter = 'all';
  selectedUser: User | null = null;
  editingUser: User | null = null;
  currentLoggedInUser: User | null = null;
  private subscriptions = new Subscription();

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentLoggedInUser = this.authService.getCurrentUser();
    this.loadUsers();

    this.subscriptions.add(
      this.userService.users$.subscribe(() => {
        this.loadUsers();
      })
    );

    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentLoggedInUser = user;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadUsers(): void {
    this.users = this.userService.getAllUsers();
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredUsers = this.users.filter(user => {
      // 1. Search term match (User ID, Full Name, Email, Phone, Location)
      const matchesSearch = !term || (
        (user.id && user.id.toLowerCase().includes(term)) ||
        (user.fullName && user.fullName.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.phone && user.phone.toLowerCase().includes(term)) ||
        (user.location?.address && user.location.address.toLowerCase().includes(term)) ||
        (user.location?.city && user.location.city.toLowerCase().includes(term)) ||
        (user.location?.region && user.location.region.toLowerCase().includes(term)) ||
        (user.location?.district && user.location.district.toLowerCase().includes(term))
      );

      // 2. Status filter (active / inactive)
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && user.isActive) ||
        (this.statusFilter === 'inactive' && !user.isActive);

      // 3. Role filter (NORMAL_USER / ADMIN)
      const matchesRole =
        this.roleFilter === 'all' ||
        user.role === this.roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.roleFilter = 'all';
    this.applyFilters();
  }

  viewUser(user: User): void {
    this.selectedUser = user;
  }

  closeDetails(): void {
    this.selectedUser = null;
  }

  openEdit(user: User): void {
    // Deep clone user for editing
    this.editingUser = JSON.parse(JSON.stringify(user));
  }

  closeEdit(): void {
    this.editingUser = null;
  }

  saveUserEdit(): void {
    if (!this.editingUser) return;

    this.userService.updateUser(this.editingUser);
    this.editingUser = null;
    this.loadUsers();
  }

  toggleUserStatus(user: User): void {
    if (this.isCurrentAdmin(user)) {
      return;
    }

    if (user.isActive) {
      this.userService.deactivateUser(user.id);
    } else {
      this.userService.activateUser(user.id);
    }

    this.loadUsers();
  }

  deleteUser(user: User): void {
    if (this.isCurrentAdmin(user)) {
      alert('You cannot delete the currently logged in Admin account.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete this user (${user.fullName})?`)) {
      this.userService.deleteUser(user.id);
      this.loadUsers();
    }
  }

  isCurrentAdmin(user: User): boolean {
    if (!this.currentLoggedInUser) return false;
    return user.id === this.currentLoggedInUser.id || user.email.toLowerCase() === this.currentLoggedInUser.email.toLowerCase();
  }
}
