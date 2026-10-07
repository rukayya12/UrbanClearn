import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { WasteRequest } from '../../../core/models/request.model';
import { getTanzaniaDateTime } from '../../../core/utils/tanzania-date-time';

@Component({
  selector: 'app-collector-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="dashboard">
      <header><span class="eyebrow">COLLECTOR WORKSPACE</span><h1>Collector Dashboard</h1><p>Your assigned collections and today's schedule.</p></header>
      <section class="stats-grid">
        <article><span>Assigned Collections</span><strong>{{ assignedCollections.length }}</strong></article>
        <article><span>Awaiting Schedule</span><strong>{{ awaitingSchedule }}</strong></article>
        <article><span>Scheduled Today</span><strong>{{ scheduledToday }}</strong></article>
        <article><span>Completed Collections</span><strong>{{ completedCollections }}</strong></article>
      </section>
      <section class="today-section">
        <div class="section-heading"><h2>Today's Collections</h2><a routerLink="/collector/requests">Assigned Collections</a></div>
        <article *ngFor="let request of todayRequests" class="today-row">
          <strong>{{ request.id }}</strong><span>{{ request.location.address }}</span><span>{{ request.confirmedCollectionTime }}</span><span class="status">{{ statusLabel(request.status) }}</span>
        </article>
        <p *ngIf="todayRequests.length === 0" class="empty">No confirmed collections scheduled for today.</p>
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; color:#17211b; } .dashboard { max-width:1100px; margin:0 auto; }
    .eyebrow { color:#15803d; font-size:11px; font-weight:800; letter-spacing:1px; } h1 { margin:6px 0; font-size:28px; }
    header p { margin:0; color:#64748b; font-size:13px; } .stats-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:22px 0; }
    .stats-grid article,.today-section { padding:16px; border:1px solid #dce8df; border-radius:7px; background:#fff; }
    .stats-grid article { display:grid; gap:10px; } .stats-grid span { color:#64748b; font-size:12px; } .stats-grid strong { color:#166534; font-size:25px; }
    .section-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; } h2 { margin:0; font-size:17px; }
    a { color:#15803d; font-size:12px; font-weight:700; } .today-row { display:grid; grid-template-columns:90px 1fr 90px 120px; gap:10px; padding:12px 0; border-bottom:1px solid #e8efea; font-size:12px; }
    .status { color:#166534; font-weight:700; } .empty { color:#64748b; font-size:13px; }
    @media(max-width:700px) { .stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .today-row { grid-template-columns:80px 1fr; } }
  `]
})
export class DashboardComponent {
  assignedCollections: WasteRequest[] = [];
  awaitingSchedule = 0;
  scheduledToday = 0;
  completedCollections = 0;
  todayRequests: WasteRequest[] = [];
  private collectorId = '';
  private subscription: Subscription;

  constructor(authService: AuthService, requestService: RequestService) {
    this.collectorId = authService.getCurrentUser()?.id || '';
    this.loadData(requestService);
    this.subscription = requestService.requests$.subscribe(() => this.loadData(requestService));
  }

  statusLabel(status: string): string {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadData(requestService: RequestService): void {
    const requests = this.collectorId ? requestService.getCollectorRequests(this.collectorId) : [];
    this.assignedCollections = requests.filter(request => !['completed', 'rejected'].includes(request.status));
    this.awaitingSchedule = requests.filter(request => ['assigned', 'reschedule-required'].includes(request.status)).length;
    this.completedCollections = requests.filter(request => request.status === 'completed').length;
    const today = getTanzaniaDateTime().date;
    this.todayRequests = requests.filter(request => request.confirmedCollectionDate === today && request.status !== 'completed');
    this.scheduledToday = this.todayRequests.length;
  }
}
