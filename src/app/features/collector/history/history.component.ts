import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { WasteRequest, WasteType } from '../../../core/models/request.model';
import { formatDateOnly, formatTime12Hour, formatTanzaniaInstant } from '../../../core/utils/tanzania-date-time';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page">
      <header><span class="eyebrow">COLLECTOR WORKSPACE</span><h1>Collection History</h1><p>Completed collections assigned to your account.</p></header>
      <section *ngIf="completedRequests.length; else emptyState" class="history-list">
        <article *ngFor="let request of completedRequests" class="history-card">
          <div class="card-heading"><strong>{{ request.id }}</strong><span class="status">Completed</span></div>
          <div class="details-grid">
            <div><span>User</span><strong>{{ request.userName }} ({{ request.userId }})</strong></div>
            <div><span>Waste Type</span><strong>{{ wasteTypeLabel(request.wasteTypes) }}</strong></div>
            <div class="wide"><span>Collection Location</span><strong>{{ request.location.address }}</strong></div>
            <div><span>Scheduled Date</span><strong>{{ collectionDate(request) }}</strong></div>
            <div><span>Scheduled Time</span><strong>{{ collectionTime(request) }}</strong></div>
            <div class="wide"><span>Completed</span><strong>{{ formatTanzaniaInstant(request.completedAt || request.completionTime) || 'Not recorded' }}</strong></div>
          </div>
          <button type="button" class="details-button" (click)="viewDetails(request)">View Details</button>
        </article>
      </section>
      <ng-template #emptyState><section class="empty-state"><span>📝</span><h2>No collection history yet.</h2><p>Completed collections will appear here.</p></section></ng-template>

      <div *ngIf="selectedRequest" class="modal-backdrop" (click)="closeDetails()">
        <section class="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div><span class="eyebrow">COLLECTION DETAILS</span><h2 id="details-title">{{ selectedRequest.id }}</h2></div>
            <button type="button" class="close-button" aria-label="Close details" (click)="closeDetails()">&times;</button>
          </header>
          <div class="modal-grid">
            <div><span>User</span><strong>{{ selectedRequest.userName }} ({{ selectedRequest.userId }})</strong></div>
            <div><span>Waste Type</span><strong>{{ wasteTypeLabel(selectedRequest.wasteTypes) }}</strong></div>
            <div class="wide"><span>Description</span><strong>{{ selectedRequest.description || 'Not provided' }}</strong></div>
            <div class="wide"><span>Collection Location</span><strong>{{ selectedRequest.location.address }}</strong></div>
            <div><span>Assigned Collector</span><strong>{{ selectedRequest.assignedCollectorName || selectedRequest.collectorName || 'Not recorded' }}</strong></div>
            <div><span>Collector ID</span><strong>{{ selectedRequest.assignedCollectorId || selectedRequest.collectorId || 'Not recorded' }}</strong></div>
            <div><span>Scheduled Date</span><strong>{{ collectionDate(selectedRequest) }}</strong></div>
            <div><span>Scheduled Time</span><strong>{{ collectionTime(selectedRequest) }}</strong></div>
            <div><span>Verification Date</span><strong>{{ instantDate(selectedRequest.verifiedAt) }}</strong></div>
            <div><span>Verification Time</span><strong>{{ instantTime(selectedRequest.verifiedAt) }}</strong></div>
            <div><span>Completed Date</span><strong>{{ instantDate(selectedRequest.completedAt || selectedRequest.completionTime) }}</strong></div>
            <div><span>Completed Time</span><strong>{{ instantTime(selectedRequest.completedAt || selectedRequest.completionTime) }}</strong></div>
            <div><span>Status</span><strong class="status-text">Completed</strong></div>
          </div>
          <footer class="modal-footer"><button type="button" class="details-button" (click)="closeDetails()">Close</button></footer>
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host { display:block; color:#17211b; } .page { max-width:1050px; margin:0 auto; }
    .eyebrow { color:#15803d; font-size:11px; font-weight:800; letter-spacing:1px; } h1 { margin:6px 0; font-size:27px; }
    header p { margin:0 0 20px; color:#64748b; font-size:13px; } .history-list { display:grid; gap:12px; }
    .history-card,.empty-state { padding:17px; border:1px solid #dce8df; border-radius:7px; background:#fff; }
    .card-heading { display:flex; justify-content:space-between; gap:12px; color:#166534; } .status { padding:4px 8px; border-radius:999px; background:#dcfce7; font-size:11px; font-weight:800; }
    .details-grid, .modal-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:15px; } .details-grid div, .modal-grid div { min-width:0; display:grid; gap:4px; }
    .details-grid .wide, .modal-grid .wide { grid-column:1/-1; } .details-grid span, .modal-grid span { color:#64748b; font-size:11px; font-weight:700; } .details-grid strong, .modal-grid strong { font-size:13px; overflow-wrap:anywhere; }
    .details-button { min-height:42px; margin-top:14px; padding:9px 14px; border:0; border-radius:5px; background:#15803d; color:#fff; font-weight:700; cursor:pointer; }
    .modal-backdrop { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:16px; background:rgba(15,23,42,.55); }
    .details-modal { width:min(100%,620px); max-height:90vh; overflow:auto; padding:20px; border:1px solid #dce8df; border-radius:7px; background:#fff; box-shadow:0 18px 48px rgba(0,0,0,.22); }
    .modal-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .modal-header h2 { margin:4px 0 0; color:#17211b; font-size:21px; }
    .close-button { width:40px; height:40px; border:0; background:transparent; color:#64748b; font-size:26px; cursor:pointer; }
    .status-text { color:#166534; }
    .modal-footer { display:flex; justify-content:flex-end; border-top:1px solid #e8efea; margin-top:16px; }
    .empty-state { padding:42px 18px; text-align:center; } .empty-state span { font-size:28px; } .empty-state h2 { margin:10px 0 5px; font-size:18px; } .empty-state p { margin:0; color:#64748b; font-size:13px; }
    @media(max-width:560px) { .details-grid { grid-template-columns:1fr; } .details-grid .wide { grid-column:auto; } }
  `]
})
export class HistoryComponent {
  completedRequests: WasteRequest[] = [];
  selectedRequest: WasteRequest | null = null;
  private collectorId = '';
  private subscription: Subscription;

  constructor(authService: AuthService, requestService: RequestService) {
    this.collectorId = authService.getCurrentUser()?.id || '';
    this.loadHistory(requestService);
    this.subscription = requestService.requests$.subscribe(() => this.loadHistory(requestService));
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

  collectionDate(request: WasteRequest): string {
    const scheduledDate = request.confirmedCollectionDate || request.proposedCollectionDate;
    if (scheduledDate) return formatDateOnly(scheduledDate);
    return this.completionDateTime(request).split(' at ')[0] || 'Not recorded';
  }

  collectionTime(request: WasteRequest): string {
    const scheduledTime = request.confirmedCollectionTime || request.proposedCollectionTime;
    if (scheduledTime) return formatTime12Hour(scheduledTime);
    return this.completionDateTime(request).split(' at ')[1] || 'Not recorded';
  }

  formatTanzaniaInstant(value?: Date | string): string {
    return formatTanzaniaInstant(value);
  }

  instantDate(value?: Date | string): string {
    return this.formatTanzaniaInstant(value).split(' at ')[0] || 'Not recorded';
  }

  instantTime(value?: Date | string): string {
    return this.formatTanzaniaInstant(value).split(' at ')[1] || 'Not recorded';
  }

  private completionDateTime(request: WasteRequest): string {
    return formatTanzaniaInstant(request.completedAt || request.completionTime);
  }

  private loadHistory(requestService: RequestService): void {
    this.completedRequests = this.collectorId
      ? requestService.getCollectorRequests(this.collectorId).filter(request => request.status === 'completed')
      : [];
  }
}
