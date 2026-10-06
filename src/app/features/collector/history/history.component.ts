import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { WasteRequest } from '../../../core/models/request.model';

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
            <div><span>Location</span><strong>{{ request.location.address }}</strong></div>
            <div><span>Waste Type</span><strong>{{ request.wasteTypes.join(', ') }}</strong></div>
            <div><span>Collection Date / Time</span><strong>{{ request.confirmedCollectionDate ? (request.confirmedCollectionDate | date:'mediumDate') : (request.completionTime | date:'mediumDate') }} {{ request.confirmedCollectionTime || (request.completionTime | date:'shortTime') }}</strong></div>
            <div class="wide"><span>Completed</span><strong>{{ (request.completedAt || request.completionTime) | date:'medium' }}</strong></div>
          </div>
        </article>
      </section>
      <ng-template #emptyState><section class="empty-state"><span>📝</span><h2>No completed collections</h2><p>Completed assigned requests will be listed here.</p></section></ng-template>
    </main>
  `,
  styles: [`
    :host { display:block; color:#17211b; } .page { max-width:1050px; margin:0 auto; }
    .eyebrow { color:#15803d; font-size:11px; font-weight:800; letter-spacing:1px; } h1 { margin:6px 0; font-size:27px; }
    header p { margin:0 0 20px; color:#64748b; font-size:13px; } .history-list { display:grid; gap:12px; }
    .history-card,.empty-state { padding:17px; border:1px solid #dce8df; border-radius:7px; background:#fff; }
    .card-heading { display:flex; justify-content:space-between; gap:12px; color:#166534; } .status { padding:4px 8px; border-radius:999px; background:#dcfce7; font-size:11px; font-weight:800; }
    .details-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:15px; } .details-grid div { display:grid; gap:4px; }
    .details-grid .wide { grid-column:1/-1; } .details-grid span { color:#64748b; font-size:11px; font-weight:700; } .details-grid strong { font-size:13px; overflow-wrap:anywhere; }
    .empty-state { padding:42px 18px; text-align:center; } .empty-state span { font-size:28px; } .empty-state h2 { margin:10px 0 5px; font-size:18px; } .empty-state p { margin:0; color:#64748b; font-size:13px; }
    @media(max-width:560px) { .details-grid { grid-template-columns:1fr; } .details-grid .wide { grid-column:auto; } }
  `]
})
export class HistoryComponent {
  completedRequests: WasteRequest[] = [];
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

  private loadHistory(requestService: RequestService): void {
    this.completedRequests = this.collectorId
      ? requestService.getCollectorRequests(this.collectorId).filter(request => request.status === 'completed')
      : [];
  }
}
