import { Component, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { RecyclingStatus, WasteRequest, WasteType } from '../../../core/models/request.model';
import { formatTanzaniaInstant } from '../../../core/utils/tanzania-date-time';

@Component({
  selector: 'app-centre-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="page-header">
        <div><span class="eyebrow">RECYCLING CENTRE</span><h1>Recycling Requests</h1><p>Completed collections available for recycling.</p></div>
        <span class="count-badge">{{ requests.length }} requests</span>
      </header>
      <p *ngIf="feedback" class="feedback" role="status">{{ feedback }}</p>
      <p *ngIf="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

      <section *ngIf="requests.length; else emptyState" class="request-list">
        <article *ngFor="let request of requests" class="request-card">
          <div class="card-header">
            <div><strong class="request-id">{{ request.id }}</strong><span class="status-badge" [ngClass]="statusClass(request.recyclingStatus || 'ready-for-recycling')">{{ statusLabel(request.recyclingStatus || 'ready-for-recycling') }}</span></div>
            <span class="collection-status">Collection: {{ statusLabel(request.status) }}</span>
          </div>
          <div class="summary-grid">
            <div><span>User</span><strong>{{ request.userName }} ({{ request.userId }})</strong></div>
            <div><span>Waste Type</span><strong>{{ wasteTypeLabel(request.wasteTypes) }}</strong></div>
            <div class="wide"><span>Description</span><strong>{{ request.description || 'Not provided' }}</strong></div>
            <div class="wide"><span>Collection Location</span><strong>{{ request.location.address }}</strong></div>
            <div><span>Collected By</span><strong>{{ request.assignedCollectorId || request.collectorId || 'Not recorded' }}</strong></div>
            <div><span>Completed</span><strong>{{ formatTanzaniaInstant(request.completedAt || request.completionTime) || 'Not recorded' }}</strong></div>
          </div>
          <div class="actions">
            <button type="button" class="secondary-button" (click)="viewDetails(request)">View Details</button>
            <button *ngIf="(request.recyclingStatus || 'ready-for-recycling') === 'ready-for-recycling'" type="button" class="primary-button" (click)="updateStatus(request, 'accepted')">Accept for Recycling</button>
            <button *ngIf="request.recyclingStatus === 'accepted'" type="button" class="primary-button" (click)="updateStatus(request, 'processing')">Start Processing</button>
            <button *ngIf="request.recyclingStatus === 'processing'" type="button" class="primary-button" (click)="updateStatus(request, 'recycled')">Mark as Recycled</button>
            <button *ngIf="(request.recyclingStatus || 'ready-for-recycling') === 'ready-for-recycling'" type="button" class="reject-button" (click)="openRejection(request)">Reject</button>
          </div>
        </article>
      </section>

      <ng-template #emptyState><section class="empty-state"><h2>No completed collections ready for recycling</h2><p>Completed collections will appear here.</p></section></ng-template>

      <div *ngIf="selectedRequest" class="modal-backdrop" (click)="closeDetails()">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="details-title" (click)="$event.stopPropagation()">
          <header><div><span class="eyebrow">COLLECTION DETAILS</span><h2 id="details-title">{{ selectedRequest.id }}</h2></div><button type="button" class="close-button" aria-label="Close details" (click)="closeDetails()">&times;</button></header>
          <div class="summary-grid modal-grid">
            <div><span>User</span><strong>{{ selectedRequest.userName }} ({{ selectedRequest.userId }})</strong></div>
            <div><span>Waste Type</span><strong>{{ wasteTypeLabel(selectedRequest.wasteTypes) }}</strong></div>
            <div class="wide"><span>Description</span><strong>{{ selectedRequest.description || 'Not provided' }}</strong></div>
            <div class="wide"><span>Collection Location</span><strong>{{ selectedRequest.location.address }}</strong></div>
            <div><span>Collected By</span><strong>{{ selectedRequest.assignedCollectorId || selectedRequest.collectorId || 'Not recorded' }}</strong></div>
            <div><span>Completed</span><strong>{{ formatTanzaniaInstant(selectedRequest.completedAt || selectedRequest.completionTime) || 'Not recorded' }}</strong></div>
            <div><span>Collection Status</span><strong>{{ statusLabel(selectedRequest.status) }}</strong></div>
            <div><span>Recycling Status</span><strong>{{ statusLabel(selectedRequest.recyclingStatus || 'ready-for-recycling') }}</strong></div>
            <div *ngIf="selectedRequest.recyclingAcceptedAt"><span>Accepted</span><strong>{{ formatTanzaniaInstant(selectedRequest.recyclingAcceptedAt) }}</strong></div>
            <div *ngIf="selectedRequest.recyclingProcessingStartedAt"><span>Processing Started</span><strong>{{ formatTanzaniaInstant(selectedRequest.recyclingProcessingStartedAt) }}</strong></div>
            <div *ngIf="selectedRequest.recycledAt"><span>Recycled</span><strong>{{ formatTanzaniaInstant(selectedRequest.recycledAt) }}</strong></div>
            <div *ngIf="selectedRequest.recyclingRejectedAt"><span>Rejected</span><strong>{{ formatTanzaniaInstant(selectedRequest.recyclingRejectedAt) }}</strong></div>
            <div class="wide" *ngIf="selectedRequest.recyclingRejectionReason"><span>Rejection Reason</span><strong>{{ selectedRequest.recyclingRejectionReason }}</strong></div>
          </div>
          <footer><button type="button" class="secondary-button" (click)="closeDetails()">Close</button></footer>
        </section>
      </div>

      <div *ngIf="rejectionRequest" class="modal-backdrop" (click)="cancelRejection()">
        <section class="modal rejection-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title" (click)="$event.stopPropagation()">
          <header><div><span class="eyebrow">RECYCLING REQUEST</span><h2 id="reject-title">Reject {{ rejectionRequest.id }}</h2></div><button type="button" class="close-button" aria-label="Close rejection" (click)="cancelRejection()">&times;</button></header>
          <form (ngSubmit)="rejectRequest()">
            <label for="rejection-reason">Reason for rejection</label>
            <textarea id="rejection-reason" name="rejectionReason" [(ngModel)]="rejectionReason" rows="3" required></textarea>
            <p *ngIf="rejectionError" class="error-message" role="alert">{{ rejectionError }}</p>
            <footer><button type="button" class="secondary-button" (click)="cancelRejection()">Cancel</button><button type="submit" class="reject-button">Confirm Rejection</button></footer>
          </form>
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host { display:block; color:#17211b; }
    .page { max-width:1100px; margin:0 auto; }
    .page-header, .card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .page-header { margin-bottom:20px; }
    .eyebrow { color:#15803d; font-size:11px; font-weight:800; letter-spacing:1px; }
    h1 { margin:5px 0; font-size:27px; } .page-header p { margin:0; color:#64748b; font-size:13px; }
    .count-badge { padding:7px 10px; border-radius:5px; background:#dcfce7; color:#166534; font-size:12px; font-weight:800; white-space:nowrap; }
    .request-list { display:grid; gap:13px; }
    .request-card, .empty-state { padding:17px; border:1px solid #dce8df; border-radius:7px; background:#fff; box-shadow:0 4px 16px rgba(21,128,61,.05); }
    .card-header > div { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
    .request-id { color:#166534; font-family:ui-monospace,monospace; }
    .collection-status { color:#475569; font-size:12px; font-weight:700; }
    .status-badge { padding:5px 8px; border-radius:999px; background:#dcfce7; color:#166534; font-size:11px; font-weight:800; }
    .status-accepted { background:#dbeafe; color:#1d4ed8; } .status-processing { background:#fef3c7; color:#92400e; }
    .status-recycled { background:#d1fae5; color:#065f46; } .status-rejected { background:#fee2e2; color:#991b1b; }
    .summary-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px 16px; margin-top:15px; }
    .summary-grid > div { min-width:0; display:grid; gap:4px; } .summary-grid .wide { grid-column:1/-1; }
    .summary-grid span { color:#64748b; font-size:11px; font-weight:700; }
    .summary-grid strong { color:#17211b; font-size:13px; overflow-wrap:anywhere; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:15px; }
    .primary-button, .secondary-button, .reject-button { min-height:42px; padding:9px 13px; border:0; border-radius:5px; font-weight:700; cursor:pointer; }
    .primary-button { background:#15803d; color:#fff; } .secondary-button { background:#f1f5f9; color:#334155; }
    .reject-button { background:#fee2e2; color:#991b1b; }
    .feedback { color:#166534; font-size:13px; font-weight:700; } .error-message { color:#b42318; font-size:13px; }
    .empty-state { padding:40px 18px; text-align:center; } .empty-state h2 { margin:0 0 7px; font-size:18px; } .empty-state p { margin:0; color:#64748b; font-size:13px; }
    .modal-backdrop { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:16px; background:rgba(15,23,42,.55); }
    .modal { width:min(100%,620px); max-height:90vh; overflow:auto; padding:20px; border:1px solid #dce8df; border-radius:7px; background:#fff; box-shadow:0 18px 48px rgba(0,0,0,.22); }
    .modal header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .modal h2 { margin:5px 0 0; font-size:20px; } .close-button { width:40px; height:40px; border:0; background:transparent; color:#64748b; font-size:25px; cursor:pointer; }
    .modal-grid { margin:18px 0; } .modal footer, .rejection-modal footer { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }
    .rejection-modal label { display:block; margin:16px 0 6px; font-size:13px; font-weight:700; }
    .rejection-modal textarea { width:100%; min-height:88px; padding:9px; border:1px solid #cbd5e1; border-radius:5px; font:inherit; resize:vertical; }
    @media(max-width:600px) { .page-header { flex-direction:column; } .summary-grid { grid-template-columns:1fr; } .summary-grid .wide { grid-column:auto; } .actions > button { width:100%; } }
  `]
})
export class RequestsComponent {
  requests: WasteRequest[] = [];
  selectedRequest: WasteRequest | null = null;
  rejectionRequest: WasteRequest | null = null;
  rejectionReason = '';
  rejectionError = '';
  feedback = '';
  errorMessage = '';
  private centreId = '';
  private requestIdToOpen: string | null = null;
  private subscription = new Subscription();

  constructor(private authService: AuthService, private requestService: RequestService, @Optional() route?: ActivatedRoute) {
    this.centreId = this.authService.getCurrentUser()?.id || '';
    this.loadRequests();
    this.subscription.add(this.requestService.requests$.subscribe(() => this.loadRequests()));
    if (route) this.subscription.add(route.queryParamMap.subscribe(params => {
      this.requestIdToOpen = params.get('requestId');
      this.openRequestedDetails();
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  viewDetails(request: WasteRequest): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
  }

  openRejection(request: WasteRequest): void {
    this.rejectionRequest = request;
    this.rejectionReason = '';
    this.rejectionError = '';
  }

  cancelRejection(): void {
    this.rejectionRequest = null;
    this.rejectionReason = '';
    this.rejectionError = '';
  }

  updateStatus(request: WasteRequest, status: RecyclingStatus): void {
    if (!this.requestService.updateRecyclingStatus(request.id, this.centreId, status)) {
      this.errorMessage = 'This recycling status change is not allowed for this request.';
      this.feedback = '';
      return;
    }
    this.feedback = `${request.id} updated to ${this.statusLabel(status)}.`;
    this.errorMessage = '';
  }

  rejectRequest(): void {
    if (!this.rejectionRequest) return;
    if (!this.rejectionReason.trim()) {
      this.rejectionError = 'Enter a reason for rejection.';
      return;
    }
    const request = this.rejectionRequest;
    if (!this.requestService.updateRecyclingStatus(request.id, this.centreId, 'rejected', this.rejectionReason)) {
      this.rejectionError = 'This recycling request can no longer be rejected.';
      return;
    }
    this.feedback = `${request.id} rejected for recycling.`;
    this.errorMessage = '';
    this.cancelRejection();
  }

  statusLabel(status: RecyclingStatus | WasteRequest['status']): string {
    if (status === 'ready-for-recycling') return 'Ready for Recycling';
    return status.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  statusClass(status: RecyclingStatus): string {
    return `status-${status}`;
  }

  wasteTypeLabel(wasteTypes: WasteType[]): string {
    const labels: Record<WasteType, string> = {
      plastic: 'Plastic Waste',
      organic: 'Household Waste',
      liquid: 'Liquid Waste',
      paper: 'Paper Waste',
      'food-waste': 'Food Waste'
    };
    return wasteTypes.map(type => labels[type]).join(', ');
  }

  formatTanzaniaInstant(value?: Date | string): string {
    return formatTanzaniaInstant(value);
  }

  completedDate(request: WasteRequest): string {
    const value = request.completedAt || request.completionTime;
    return value ? formatTanzaniaInstant(value).split(' at ')[0] : 'Not recorded';
  }

  completedTime(request: WasteRequest): string {
    const value = request.completedAt || request.completionTime;
    return value ? formatTanzaniaInstant(value).split(' at ')[1] : 'Not recorded';
  }

  private loadRequests(): void {
    this.requests = this.requestService.getRecyclingRequests(this.centreId);
    this.openRequestedDetails();
  }

  private openRequestedDetails(): void {
    if (!this.requestIdToOpen) return;
    const request = this.requests.find(item => item.id === this.requestIdToOpen);
    if (!request) return;
    this.selectedRequest = request;
    this.requestIdToOpen = null;
  }
}
