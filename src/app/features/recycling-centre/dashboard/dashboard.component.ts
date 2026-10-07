import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { RecyclingStatus, WasteRequest, WasteType } from '../../../core/models/request.model';

@Component({
  selector: 'app-recycling-centre-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="dashboard">
      <header class="dashboard-header">
        <div><span class="eyebrow">RECYCLING CENTRE</span><h1>Recycling Centre Dashboard</h1><p>Overview of completed collections available to your centre.</p></div>
      </header>

      <section class="stats-grid" aria-label="Recycling request totals">
        <article class="stat-card"><span>Total Recycling Requests</span><strong>{{ totalRequests }}</strong></article>
        <article class="stat-card"><span>Ready for Recycling</span><strong>{{ readyRequests }}</strong></article>
        <article class="stat-card"><span>Accepted</span><strong>{{ acceptedRequests }}</strong></article>
        <article class="stat-card"><span>Processing</span><strong>{{ processingRequests }}</strong></article>
        <article class="stat-card"><span>Recycled</span><strong>{{ recycledRequests }}</strong></article>
        <article class="stat-card"><span>Rejected</span><strong>{{ rejectedRequests }}</strong></article>
      </section>

      <section class="recent-section">
        <header class="section-header"><h2>Recent Recycling Requests</h2><a routerLink="/centre/requests">View Recycling Requests</a></header>
        <div *ngIf="recentRequests.length; else emptyState" class="recent-list">
          <article *ngFor="let request of recentRequests" class="request-row">
            <div class="request-main">
              <strong class="request-id">{{ request.id }}</strong>
              <span>Waste Type: {{ wasteTypeLabel(request.wasteTypes) }}</span>
              <span>Location: {{ request.location.address }}</span>
            </div>
            <div class="request-actions">
              <span class="status-badge" [ngClass]="'status-' + (request.recyclingStatus || 'ready-for-recycling')">{{ statusLabel(request.recyclingStatus || 'ready-for-recycling') }}</span>
              <a class="details-button" [routerLink]="['/centre/requests']" [queryParams]="{ requestId: request.id }">View Details</a>
            </div>
          </article>
        </div>
        <ng-template #emptyState><div class="empty-state">No recycling requests available.<br />Completed waste collections will appear here when they are ready for recycling.</div></ng-template>
      </section>

      <nav class="quick-actions" aria-label="Recycling Centre actions">
        <a routerLink="/centre/requests">View Recycling Requests</a>
        <a routerLink="/centre/recycling">View Recycling History</a>
      </nav>
    </main>
  `,
  styles: [`
    :host { display:block; color:#17211b; }
    .dashboard { max-width:1120px; margin:0 auto; }
    .dashboard-header { margin-bottom:20px; }
    .eyebrow { color:#15803d; font-size:11px; font-weight:800; letter-spacing:1px; }
    h1 { margin:5px 0; font-size:27px; } .dashboard-header p { margin:0; color:#64748b; font-size:13px; }
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(155px,1fr)); gap:11px; margin-bottom:24px; }
    .stat-card { min-height:92px; display:grid; align-content:space-between; gap:12px; padding:15px; border:1px solid #dce8df; border-radius:7px; background:#fff; box-shadow:0 4px 16px rgba(21,128,61,.05); }
    .stat-card span { color:#64748b; font-size:12px; font-weight:700; } .stat-card strong { color:#166534; font-size:25px; }
    .recent-section { padding:17px; border:1px solid #dce8df; border-radius:7px; background:#fff; }
    .section-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
    .section-header h2 { margin:0; font-size:18px; } a { color:#15803d; font-size:12px; font-weight:700; }
    .recent-list { display:grid; } .request-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:13px 0; border-top:1px solid #e8efea; }
    .request-main { display:grid; grid-template-columns:minmax(70px,auto) 1fr 1fr; align-items:center; gap:10px 16px; min-width:0; }
    .request-main span { color:#475569; font-size:12px; overflow-wrap:anywhere; } .request-id { color:#166534; font-family:ui-monospace,monospace; }
    .request-actions { display:flex; align-items:center; gap:12px; flex-shrink:0; }
    .status-badge { padding:5px 8px; border-radius:999px; background:#dcfce7; color:#166534; font-size:11px; font-weight:800; white-space:nowrap; }
    .status-accepted { background:#dbeafe; color:#1d4ed8; } .status-processing { background:#fef3c7; color:#92400e; }
    .status-recycled { background:#d1fae5; color:#065f46; } .status-rejected { background:#fee2e2; color:#991b1b; }
    .details-button, .quick-actions a { min-height:40px; display:inline-flex; align-items:center; justify-content:center; padding:8px 12px; border-radius:5px; background:#15803d; color:#fff; text-decoration:none; white-space:nowrap; }
    .empty-state { padding:28px 12px; color:#64748b; text-align:center; line-height:1.6; }
    .quick-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:16px; }
    @media(max-width:700px) { .stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .request-row { align-items:stretch; flex-direction:column; } .request-main { grid-template-columns:1fr; gap:6px; } .request-actions { justify-content:space-between; } .quick-actions a { flex:1; } }
    @media(max-width:380px) { .stats-grid { grid-template-columns:1fr; } .section-header { align-items:flex-start; flex-direction:column; } }
  `]
})
export class DashboardComponent {
  totalRequests = 0;
  readyRequests = 0;
  acceptedRequests = 0;
  processingRequests = 0;
  recycledRequests = 0;
  rejectedRequests = 0;
  recentRequests: WasteRequest[] = [];
  private centreId = '';
  private subscription: Subscription;

  constructor(authService: AuthService, private requestService: RequestService) {
    this.centreId = authService.getCurrentUser()?.id || '';
    this.loadDashboardData();
    this.subscription = this.requestService.requests$.subscribe(() => this.loadDashboardData());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  statusLabel(status: RecyclingStatus): string {
    if (status === 'ready-for-recycling') return 'Ready for Recycling';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  wasteTypeLabel(wasteTypes: WasteType[]): string {
    const labels: Record<WasteType, string> = {
      plastic: 'Plastic',
      organic: 'Household Waste',
      liquid: 'Liquid Waste',
      paper: 'Paper',
      'food-waste': 'Food Waste'
    };
    return wasteTypes.map(type => labels[type]).join(', ');
  }

  private loadDashboardData(): void {
    const requests = this.centreId ? this.requestService.getRecyclingRequests(this.centreId) : [];
    const recyclingStatus = (request: WasteRequest): RecyclingStatus => request.recyclingStatus || 'ready-for-recycling';
    this.totalRequests = requests.length;
    this.readyRequests = requests.filter(request => recyclingStatus(request) === 'ready-for-recycling').length;
    this.acceptedRequests = requests.filter(request => recyclingStatus(request) === 'accepted').length;
    this.processingRequests = requests.filter(request => recyclingStatus(request) === 'processing').length;
    this.recycledRequests = requests.filter(request => recyclingStatus(request) === 'recycled').length;
    this.rejectedRequests = requests.filter(request => recyclingStatus(request) === 'rejected').length;
    this.recentRequests = [...requests]
      .sort((first, second) => new Date(second.updatedAt || second.completedAt || second.createdAt).getTime() - new Date(first.updatedAt || first.completedAt || first.createdAt).getTime())
      .slice(0, 5);
  }
}
