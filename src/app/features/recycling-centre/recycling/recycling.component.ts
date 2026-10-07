import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { RecyclingStatus, RequestStatus, WasteRequest, WasteType } from '../../../core/models/request.model';
import { formatTanzaniaInstant } from '../../../core/utils/tanzania-date-time';

@Component({
  selector: 'app-recycling',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="page-header">
        <div><span class="eyebrow">RECYCLING CENTRE</span><h1>Recycling History</h1><p>Records processed by your recycling centre.</p></div>
        <span class="count-badge">{{ filteredRequests.length }} records</span>
      </header>

      <section class="history-toolbar" aria-label="History filters">
        <div class="status-filters" role="group" aria-label="Filter by recycling status">
          <button type="button" [class.active]="statusFilter === 'recycled'" (click)="setStatusFilter('recycled')">Recycled</button>
          <button type="button" [class.active]="statusFilter === 'all'" (click)="setStatusFilter('all')">All</button>
          <button type="button" [class.active]="statusFilter === 'rejected'" (click)="setStatusFilter('rejected')">Rejected</button>
        </div>
        <input type="search" aria-label="Search recycling history" placeholder="Search recycling history..." [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" />
      </section>

      <section *ngIf="filteredRequests.length; else emptyState" class="history-list">
        <article *ngFor="let request of filteredRequests" class="history-card">
          <div class="card-header">
            <strong class="request-id">{{ request.id }}</strong>
            <span class="status-badge" [ngClass]="'status-' + request.recyclingStatus">{{ statusLabel(request.recyclingStatus!) }}</span>
          </div>
          <div class="summary-grid">
            <div><span>User</span><strong>{{ request.userName }} ({{ request.userId }})</strong></div>
            <div><span>Waste Type</span><strong>{{ wasteTypeLabel(request.wasteTypes) }}</strong></div>
            <div class="wide"><span>Location</span><strong>{{ request.location.address }}</strong></div>
            <div><span>Collector</span><strong>{{ collectorLabel(request) }}</strong></div>
            <div><span>Collection Completed</span><strong>{{ formatInstant(request.completedAt || request.completionTime) }}</strong></div>
            <div><span>Recycled</span><strong>{{ formatInstant(request.recycledAt) }}</strong></div>
          </div>
          <button type="button" class="details-button" (click)="viewDetails(request)">View Details</button>
        </article>
      </section>

      <ng-template #emptyState>
        <section class="empty-state">
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyMessage }}</p>
        </section>
      </ng-template>

      <div *ngIf="selectedRequest" class="modal-backdrop" (click)="closeDetails()">
        <section class="details-modal" role="dialog" aria-modal="true" aria-labelledby="history-details-title" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div><span class="eyebrow">RECYCLING DETAILS</span><h2 id="history-details-title">{{ selectedRequest.id }}</h2></div>
            <button type="button" class="close-button" aria-label="Close details" (click)="closeDetails()">&times;</button>
          </header>
          <div class="details-grid">
            <div><span>User</span><strong>{{ selectedRequest.userName }} ({{ selectedRequest.userId }})</strong></div>
            <div><span>Waste Type</span><strong>{{ wasteTypeLabel(selectedRequest.wasteTypes) }}</strong></div>
            <div class="wide"><span>Description</span><strong>{{ selectedRequest.description || 'Not provided' }}</strong></div>
            <div class="wide"><span>Collection Location</span><strong>{{ selectedRequest.location.address }}</strong></div>
            <div><span>Collector</span><strong>{{ collectorLabel(selectedRequest) }}</strong></div>
            <div><span>Collection Status</span><strong>{{ statusLabel(selectedRequest.status) }}</strong></div>
            <div><span>Collection Completed</span><strong>{{ formatInstant(selectedRequest.completedAt || selectedRequest.completionTime) }}</strong></div>
            <div><span>Recycling Centre</span><strong>{{ selectedRequest.recyclingCentreId || 'Not recorded' }}</strong></div>
            <div><span>Accepted</span><strong>{{ formatInstant(selectedRequest.recyclingAcceptedAt) }}</strong></div>
            <div><span>Processing Started</span><strong>{{ formatInstant(selectedRequest.recyclingProcessingStartedAt) }}</strong></div>
            <div><span>Recycled</span><strong>{{ formatInstant(selectedRequest.recycledAt) }}</strong></div>
            <div><span>Recycling Status</span><strong class="status-text">{{ statusLabel(selectedRequest.recyclingStatus!) }}</strong></div>
            <div class="wide" *ngIf="selectedRequest.recyclingRejectionReason"><span>Rejection Reason</span><strong>{{ selectedRequest.recyclingRejectionReason }}</strong></div>
          </div>
          <footer><button type="button" class="details-button" (click)="closeDetails()">Close</button></footer>
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host { display:block; color:#17211b; }
    .page { max-width:1100px; margin:0 auto; }
    .page-header, .card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .page-header { margin-bottom:18px; }
    .eyebrow { color:#15803d; font-size:11px; font-weight:800; letter-spacing:1px; }
    h1 { margin:5px 0; font-size:27px; } .page-header p { margin:0; color:#64748b; font-size:13px; }
    .count-badge { padding:7px 10px; border-radius:5px; background:#dcfce7; color:#166534; font-size:12px; font-weight:800; white-space:nowrap; }
    .history-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
    .status-filters { display:flex; gap:6px; }
    .status-filters button { min-height:38px; padding:7px 12px; border:1px solid #dce8df; border-radius:5px; background:#fff; color:#365343; font-weight:700; cursor:pointer; }
    .status-filters button.active { border-color:#15803d; background:#15803d; color:#fff; }
    .history-toolbar input { width:min(100%,320px); min-height:40px; padding:8px 10px; border:1px solid #cbd5e1; border-radius:5px; font:inherit; }
    .history-list { display:grid; gap:12px; }
    .history-card, .empty-state { padding:17px; border:1px solid #dce8df; border-radius:7px; background:#fff; box-shadow:0 4px 16px rgba(21,128,61,.05); }
    .card-header { align-items:center; } .request-id { color:#166534; font-family:ui-monospace,monospace; }
    .status-badge { padding:5px 8px; border-radius:999px; background:#d1fae5; color:#065f46; font-size:11px; font-weight:800; }
    .status-rejected { background:#fee2e2; color:#991b1b; }
    .summary-grid, .details-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px 16px; margin-top:15px; }
    .summary-grid div, .details-grid div { min-width:0; display:grid; gap:4px; }
    .summary-grid .wide, .details-grid .wide { grid-column:1/-1; }
    .summary-grid span, .details-grid span { color:#64748b; font-size:11px; font-weight:700; }
    .summary-grid strong, .details-grid strong { font-size:13px; overflow-wrap:anywhere; }
    .details-button { min-height:42px; margin-top:14px; padding:9px 14px; border:0; border-radius:5px; background:#15803d; color:#fff; font-weight:700; cursor:pointer; }
    .empty-state { padding:38px 18px; text-align:center; } .empty-state h2 { margin:0 0 7px; font-size:18px; } .empty-state p { margin:0; color:#64748b; font-size:13px; }
    .modal-backdrop { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:16px; background:rgba(15,23,42,.55); }
    .details-modal { width:min(100%,650px); max-height:90vh; overflow:auto; padding:20px; border:1px solid #dce8df; border-radius:7px; background:#fff; box-shadow:0 18px 48px rgba(0,0,0,.22); }
    .modal-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; } .modal-header h2 { margin:5px 0 0; font-size:20px; }
    .close-button { width:40px; height:40px; border:0; background:transparent; color:#64748b; font-size:25px; cursor:pointer; }
    .status-text { color:#166534; } .details-modal footer { display:flex; justify-content:flex-end; margin-top:15px; border-top:1px solid #e8efea; }
    @media(max-width:620px) { .page-header { flex-direction:column; } .history-toolbar { align-items:stretch; flex-direction:column; } .status-filters button { flex:1; } .history-toolbar input { width:100%; } .summary-grid, .details-grid { grid-template-columns:1fr; } .summary-grid .wide, .details-grid .wide { grid-column:auto; } }
  `]
})
export class RecyclingComponent {
  requests: WasteRequest[] = [];
  filteredRequests: WasteRequest[] = [];
  selectedRequest: WasteRequest | null = null;
  statusFilter: 'recycled' | 'rejected' | 'all' = 'recycled';
  searchTerm = '';
  private centreId = '';
  private subscription: Subscription;

  constructor(authService: AuthService, private requestService: RequestService) {
    this.centreId = authService.getCurrentUser()?.id || '';
    this.loadRequests();
    this.subscription = this.requestService.requests$.subscribe(() => this.loadRequests());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  setStatusFilter(filter: 'recycled' | 'rejected' | 'all'): void {
    this.statusFilter = filter;
    this.applyFilters();
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();
    this.filteredRequests = this.requests.filter(request => {
      const statusMatches = this.statusFilter === 'all' || request.recyclingStatus === this.statusFilter;
      const searchMatches = !search || [
        request.id,
        request.userId,
        request.userName,
        request.location.address,
        ...request.wasteTypes
      ].some(value => value.toLowerCase().includes(search));
      return statusMatches && searchMatches;
    });
  }

  viewDetails(request: WasteRequest): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
  }

  statusLabel(status: RecyclingStatus | RequestStatus): string {
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

  collectorLabel(request: WasteRequest): string {
    const id = request.assignedCollectorId || request.collectorId;
    const name = request.assignedCollectorName || request.collectorName;
    return id ? `${name || 'Collector'} (${id})` : name || 'Not recorded';
  }

  formatInstant(value?: Date | string): string {
    return formatTanzaniaInstant(value) || 'Not recorded';
  }

  get emptyTitle(): string {
    return this.statusFilter === 'recycled' && !this.searchTerm ? 'No recycling history yet.' : 'No recycling history found.';
  }

  get emptyMessage(): string {
    return this.statusFilter === 'recycled' && !this.searchTerm
      ? 'Completed recycling requests will appear here.'
      : 'Try another status filter or search term.';
  }

  private loadRequests(): void {
    this.requests = this.centreId
      ? this.requestService.getRecyclingRequests(this.centreId).filter(request =>
          request.recyclingStatus === 'recycled' || request.recyclingStatus === 'rejected'
        )
      : [];
    this.applyFilters();
  }
}
