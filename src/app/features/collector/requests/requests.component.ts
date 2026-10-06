import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { WasteRequest, RequestStatus } from '../../../core/models/request.model';

@Component({
  selector: 'app-collector-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="page-header">
        <div><span class="eyebrow">COLLECTOR WORKSPACE</span><h1>Assigned Collections</h1><p>Requests assigned to your Collector account.</p></div>
        <span class="count-badge">{{ requests.length }} assigned</span>
      </header>

      <section *ngIf="requests.length; else emptyState" class="request-list">
        <article *ngFor="let request of requests" class="request-card">
          <div class="card-heading">
            <div><span class="request-id">{{ request.id }}</span><h2>{{ request.userName }}</h2></div>
            <span class="status-badge" [ngClass]="statusClass(request.status)">{{ statusLabel(request.status) }}</span>
          </div>

          <div class="details-grid">
            <div><span>User</span><strong>{{ request.userName }} ({{ request.userId }})</strong></div>
            <div><span>Waste Type</span><strong>{{ request.wasteTypes.join(', ') }}</strong></div>
            <div class="wide"><span>Collection Location</span><strong>{{ request.location.address }}</strong></div>
            <div><span>User Preferred Date</span><strong>{{ request.preferredDate ? (request.preferredDate | date:'mediumDate') : 'No preference' }}</strong></div>
            <div><span>User Preferred Time</span><strong>{{ request.preferredTime || 'No preference' }}</strong></div>
            <div *ngIf="request.proposedCollectionDate"><span>Proposed Collection</span><strong>{{ request.proposedCollectionDate | date:'mediumDate' }} at {{ request.proposedCollectionTime }}</strong></div>
            <div *ngIf="request.confirmedCollectionDate"><span>Confirmed Collection</span><strong>{{ request.confirmedCollectionDate | date:'mediumDate' }} at {{ request.confirmedCollectionTime }}</strong></div>
            <div class="wide" *ngIf="request.description"><span>Description</span><strong>{{ request.description }}</strong></div>
          </div>

          <section *ngIf="request.status === 'assigned' || request.status === 'reschedule-required'" class="schedule-form">
            <h3>{{ request.status === 'reschedule-required' ? 'Choose a different collection time' : 'Propose a collection time' }}</h3>
            <p *ngIf="request.status === 'reschedule-required'" class="reschedule-note">Admin requested a different time. Your earlier proposal was not approved.</p>
            <div class="schedule-fields">
              <label>Collection Date<input type="date" [name]="'date-' + request.id" [(ngModel)]="scheduleDrafts[request.id].date" [min]="today" /></label>
              <label>Collection Time<input type="time" [name]="'time-' + request.id" [(ngModel)]="scheduleDrafts[request.id].time" /></label>
              <button type="button" class="primary-button" (click)="proposeTime(request)">Schedule Collection</button>
            </div>
            <p *ngIf="scheduleErrors[request.id]" class="error-message" role="alert">{{ scheduleErrors[request.id] }}</p>
          </section>

          <div class="collection-actions" *ngIf="nextStatus(request.status) as next">
            <button type="button" class="status-action" (click)="advanceStatus(request, next)">{{ actionLabel(next) }}</button>
          </div>
        </article>
      </section>

      <ng-template #emptyState>
        <section class="empty-state"><span>📋</span><h2>No assigned collections</h2><p>New Admin assignments will appear here.</p></section>
      </ng-template>
    </main>
  `,
  styles: [`
    :host { display: block; color: #17211b; }
    .page { max-width: 1100px; margin: 0 auto; }
    .page-header, .card-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
    .page-header { margin-bottom: 22px; }
    .eyebrow { color: #15803d; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
    h1 { margin: 5px 0; font-size: 27px; }
    .page-header p { margin: 0; color: #64748b; font-size: 13px; }
    .count-badge, .request-id { color: #166534; font-size: 12px; font-weight: 800; }
    .count-badge { padding: 8px 11px; border-radius: 5px; background: #dcfce7; }
    .request-list { display: grid; gap: 14px; }
    .request-card, .empty-state { padding: 18px; border: 1px solid #dce8df; border-radius: 7px; background: #fff; box-shadow: 0 4px 16px rgba(21,128,61,.05); }
    .card-heading h2 { margin: 4px 0 0; font-size: 17px; }
    .status-badge { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .status-assigned { background: #dbeafe; color: #1e40af; }
    .status-time-proposed { background: #e0f2fe; color: #075985; }
    .status-reschedule-required { background: #fef3c7; color: #92400e; }
    .status-scheduled { background: #dcfce7; color: #166534; }
    .status-on-the-way { background: #ccfbf1; color: #115e59; }
    .status-collected { background: #d1fae5; color: #065f46; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .details-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 13px 18px; margin-top: 18px; }
    .details-grid div { min-width: 0; display: grid; gap: 4px; }
    .details-grid .wide { grid-column: 1 / -1; }
    .details-grid span { color: #64748b; font-size: 11px; font-weight: 700; }
    .details-grid strong { font-size: 13px; overflow-wrap: anywhere; }
    .schedule-form { margin-top: 18px; padding: 15px; border-radius: 6px; background: #f0fdf4; }
    .schedule-form h3 { margin: 0; font-size: 15px; }
    .reschedule-note { color: #92400e; font-size: 12px; }
    .schedule-fields { display: grid; grid-template-columns: 1fr 1fr auto; align-items: end; gap: 10px; margin-top: 12px; }
    .schedule-fields label { display: grid; gap: 5px; color: #365343; font-size: 12px; font-weight: 700; }
    input { min-width: 0; height: 39px; padding: 8px; border: 1px solid #c8d5cc; border-radius: 4px; background: #fff; font: inherit; }
    .primary-button, .status-action { min-height: 39px; padding: 9px 13px; border: 0; border-radius: 5px; background: #15803d; color: #fff; font-weight: 700; cursor: pointer; }
    .collection-actions { display: flex; justify-content: flex-end; margin-top: 14px; }
    .status-action { background: #0f766e; }
    .error-message { color: #b42318; font-size: 12px; }
    .empty-state { padding: 44px 18px; text-align: center; }
    .empty-state span { font-size: 28px; }
    .empty-state h2 { margin: 10px 0 5px; font-size: 18px; }
    .empty-state p { margin: 0; color: #64748b; font-size: 13px; }
    @media (max-width: 620px) { .page-header { align-items: flex-start; flex-direction: column; } .details-grid { grid-template-columns: 1fr; } .details-grid .wide { grid-column: auto; } .schedule-fields { grid-template-columns: 1fr; } .primary-button { width: 100%; } }
  `]
})
export class RequestsComponent {
  requests: WasteRequest[] = [];
  scheduleDrafts: Record<string, { date: string; time: string }> = {};
  scheduleErrors: Record<string, string> = {};
  readonly today = new Date().toISOString().slice(0, 10);
  private subscription: Subscription;
  private collectorId = '';

  constructor(private authService: AuthService, private requestService: RequestService) {
    this.collectorId = this.authService.getCurrentUser()?.id || '';
    this.loadRequests();
    this.subscription = this.requestService.requests$.subscribe(() => this.loadRequests());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  statusLabel(status: RequestStatus): string {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  statusClass(status: RequestStatus): string {
    return `status-${status}`;
  }

  nextStatus(status: RequestStatus): 'on-the-way' | 'collected' | 'completed' | null {
    if (status === 'scheduled') return 'on-the-way';
    if (status === 'on-the-way') return 'collected';
    if (status === 'collected') return 'completed';
    return null;
  }

  actionLabel(status: 'on-the-way' | 'collected' | 'completed'): string {
    return status === 'on-the-way' ? 'Mark On the Way' : status === 'collected' ? 'Mark Collected' : 'Complete Collection';
  }

  proposeTime(request: WasteRequest): void {
    const draft = this.scheduleDrafts[request.id];
    if (!draft?.date || !draft.time) {
      this.scheduleErrors[request.id] = 'Choose both a collection date and time.';
      return;
    }
    const success = this.requestService.proposeCollectionTime(request.id, this.collectorId, draft.date, draft.time);
    this.scheduleErrors[request.id] = success ? '' : 'That time is unavailable or conflicts with another assigned collection.';
  }

  advanceStatus(request: WasteRequest, status: 'on-the-way' | 'collected' | 'completed'): void {
    this.requestService.updateCollectionStatus(request.id, status);
  }

  private loadRequests(): void {
    this.requests = this.collectorId ? this.requestService.getCollectorRequests(this.collectorId) : [];
    for (const request of this.requests) {
      if (!this.scheduleDrafts[request.id]) {
        this.scheduleDrafts[request.id] = {
          date: request.preferredDate || this.today,
          time: request.preferredTime || ''
        };
      }
    }
  }
}
