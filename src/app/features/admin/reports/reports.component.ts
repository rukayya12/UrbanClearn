import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ReportService } from '../../../core/services/report.service';
import { WasteReport, WasteReportStatus } from '../../../core/models/request.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="reports-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">ADMIN MANAGEMENT</span>
          <h1>Community Reports</h1>
          <p>Review reports submitted by Normal Users and update their status.</p>
        </div>
        <span class="total-badge">{{ reports.length }} total</span>
      </header>

      <section class="summary-row" aria-label="Report status totals">
        <div class="summary-item"><span>Pending</span><strong>{{ countByStatus('Pending') }}</strong></div>
        <div class="summary-item"><span>In Progress</span><strong>{{ countByStatus('In Progress') }}</strong></div>
        <div class="summary-item"><span>Resolved</span><strong>{{ countByStatus('Resolved') }}</strong></div>
        <div class="summary-item"><span>Rejected</span><strong>{{ countByStatus('Rejected') }}</strong></div>
      </section>

      <section *ngIf="reports.length; else emptyState" class="report-list" aria-label="All user reports">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Submitted By</th>
                <th>Report Type</th>
                <th>Description</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let report of reports">
                <td><span class="report-id">{{ report.id }}</span></td>
                <td><strong>{{ report.reporterName }}</strong><small>{{ report.reporterId }}</small></td>
                <td>{{ report.reportType }}</td>
                <td class="description-cell">{{ report.description }}</td>
                <td class="location-cell">{{ report.location }}</td>
                <td>{{ report.createdAt | date:'mediumDate' }}</td>
                <td><span class="status-badge" [ngClass]="statusClass(report.status)">{{ report.status }}</span></td>
                <td>
                  <div class="actions">
                    <button type="button" class="view-button" (click)="openDetails(report)">View</button>
                    <button *ngFor="let nextStatus of nextStatuses(report.status)" type="button" class="status-button" [ngClass]="statusClass(nextStatus)" (click)="changeStatus(report, nextStatus)">
                      {{ nextStatus === 'In Progress' ? 'Start' : nextStatus }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-list">
          <article *ngFor="let report of reports" class="mobile-report">
            <div class="card-topline">
              <span class="report-id">{{ report.id }}</span>
              <span class="status-badge" [ngClass]="statusClass(report.status)">{{ report.status }}</span>
            </div>
            <h2>{{ report.reportType }}</h2>
            <p class="description">{{ report.description }}</p>
            <dl>
              <div><dt>Submitted by</dt><dd>{{ report.reporterName }} ({{ report.reporterId }})</dd></div>
              <div><dt>Location</dt><dd>{{ report.location }}</dd></div>
              <div><dt>Date</dt><dd>{{ report.createdAt | date:'mediumDate' }}</dd></div>
            </dl>
            <div class="mobile-actions">
              <button type="button" class="view-button" (click)="openDetails(report)">View Details</button>
              <button *ngFor="let nextStatus of nextStatuses(report.status)" type="button" class="status-button" [ngClass]="statusClass(nextStatus)" (click)="changeStatus(report, nextStatus)">
                {{ nextStatus === 'In Progress' ? 'Start Review' : nextStatus }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <ng-template #emptyState>
        <section class="empty-state">
          <span class="empty-icon">📋</span>
          <h2>No reports submitted</h2>
          <p>Reports submitted by Normal Users will appear here.</p>
        </section>
      </ng-template>

      <div *ngIf="selectedReport" class="modal-backdrop" (click)="closeDetails()">
        <section class="details-modal" role="dialog" aria-modal="true" [attr.aria-label]="'Details for ' + selectedReport.id" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div><span class="eyebrow">REPORT DETAILS</span><h2>{{ selectedReport.id }}</h2></div>
            <button type="button" class="close-button" aria-label="Close report details" (click)="closeDetails()">×</button>
          </header>
          <dl class="detail-list">
            <div><dt>Submitted by</dt><dd>{{ selectedReport.reporterName }} ({{ selectedReport.reporterId }})</dd></div>
            <div><dt>Report type</dt><dd>{{ selectedReport.reportType }}</dd></div>
            <div><dt>Description</dt><dd>{{ selectedReport.description }}</dd></div>
            <div><dt>Location</dt><dd>{{ selectedReport.location }}</dd></div>
            <div><dt>Date</dt><dd>{{ selectedReport.createdAt | date:'fullDate' }}</dd></div>
            <div><dt>Status</dt><dd><span class="status-badge" [ngClass]="statusClass(selectedReport.status)">{{ selectedReport.status }}</span></dd></div>
          </dl>
          <footer class="modal-actions">
            <button *ngFor="let nextStatus of nextStatuses(selectedReport.status)" type="button" class="status-button" [ngClass]="statusClass(nextStatus)" (click)="changeStatus(selectedReport, nextStatus)">
              {{ nextStatus === 'In Progress' ? 'Start Review' : nextStatus }}
            </button>
          </footer>
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; color: #17211B; }
    .reports-page { max-width: 1280px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
    .eyebrow { color: #15803D; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
    h1 { margin: 6px 0; font-size: 28px; }
    .page-header p { margin: 0; color: #64748B; line-height: 1.5; }
    .total-badge { padding: 8px 12px; border: 1px solid #BBF7D0; border-radius: 5px; background: #DCFCE7; color: #166534; font-size: 13px; font-weight: 800; white-space: nowrap; }
    .summary-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .summary-item { min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px; border: 1px solid #DCE8DF; border-radius: 7px; background: #fff; }
    .summary-item span { color: #64748B; font-size: 13px; }
    .summary-item strong { color: #166534; font-size: 21px; }
    .report-list { border: 1px solid #DCE8DF; border-radius: 7px; background: #fff; overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 950px; }
    th, td { padding: 13px 12px; border-bottom: 1px solid #E8EFEA; text-align: left; vertical-align: top; font-size: 12px; }
    th { background: #F0FDF4; color: #365343; font-size: 11px; text-transform: uppercase; }
    td small { display: block; margin-top: 3px; color: #64748B; }
    .report-id { color: #166534; font-size: 12px; font-weight: 800; white-space: nowrap; }
    .description-cell { max-width: 190px; overflow-wrap: anywhere; }
    .location-cell { max-width: 140px; overflow-wrap: anywhere; }
    .status-badge { display: inline-block; padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .status-pending { background: #FFF7E6; color: #8A5A00; }
    .status-in-progress { background: #E0F2FE; color: #075985; }
    .status-resolved { background: #DCFCE7; color: #166534; }
    .status-rejected { background: #FEE4E2; color: #912018; }
    .actions, .mobile-actions, .modal-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .view-button, .status-button { min-height: 31px; padding: 6px 9px; border: 1px solid #C8D5CC; border-radius: 4px; background: #fff; color: #166534; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
    .view-button:hover { background: #F0FDF4; }
    .status-button.status-in-progress { border-color: #BAE6FD; }
    .status-button.status-resolved { border-color: #BBF7D0; }
    .status-button.status-rejected { border-color: #FECDCA; }
    .mobile-list { display: none; }
    .empty-state { padding: 48px 20px; border: 1px solid #DCE8DF; border-radius: 7px; background: #fff; text-align: center; }
    .empty-icon { font-size: 28px; }
    .empty-state h2 { margin: 10px 0 5px; font-size: 18px; }
    .empty-state p { margin: 0; color: #64748B; font-size: 13px; }
    .modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px; background: rgba(15, 23, 18, .45); }
    .details-modal { width: min(100%, 560px); max-height: min(90vh, 760px); overflow-y: auto; padding: 22px; border-radius: 8px; background: #fff; box-shadow: 0 18px 48px rgba(0, 0, 0, .2); }
    .modal-header { display: flex; justify-content: space-between; gap: 12px; }
    .modal-header h2 { margin: 5px 0 0; }
    .close-button { width: 34px; height: 34px; border: 0; border-radius: 5px; background: #F0FDF4; color: #166534; font-size: 25px; cursor: pointer; }
    .detail-list { display: grid; gap: 13px; margin: 22px 0; }
    .detail-list div { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 12px; }
    dt { color: #64748B; font-size: 12px; font-weight: 700; }
    dd { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
    .modal-actions { justify-content: flex-end; padding-top: 14px; border-top: 1px solid #E8EFEA; }
    @media (max-width: 850px) { .table-wrap { display: none; } .mobile-list { display: grid; gap: 12px; padding: 12px; } .mobile-report { padding: 15px; border: 1px solid #E1EAE3; border-radius: 6px; } .mobile-report h2 { margin: 11px 0 5px; font-size: 16px; } .description { color: #64748B; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; } .mobile-report dl { display: grid; gap: 9px; margin: 12px 0; } .mobile-report dl div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 8px; } .mobile-report dt { color: #64748B; font-size: 11px; font-weight: 700; } .mobile-report dd { margin: 0; font-size: 12px; overflow-wrap: anywhere; } }
    @media (max-width: 560px) { .page-header { align-items: flex-start; flex-direction: column; } .summary-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } .summary-item { min-height: 60px; padding: 11px; } .summary-item span { font-size: 12px; } .summary-item strong { font-size: 18px; } .detail-list div { grid-template-columns: 100px minmax(0, 1fr); } }
  `]
})
export class ReportsComponent implements OnInit, OnDestroy {
  reports: WasteReport[] = [];
  selectedReport: WasteReport | null = null;
  private subscription?: Subscription;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.reportService.refreshReports();
    this.loadReports();
    this.subscription = this.reportService.reports$.subscribe(() => this.loadReports());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  countByStatus(status: WasteReportStatus): number {
    return this.reports.filter(report => report.status === status).length;
  }

  statusClass(status: WasteReportStatus): string {
    return `status-${status.toLowerCase().replace(' ', '-')}`;
  }

  nextStatuses(status: WasteReportStatus): WasteReportStatus[] {
    if (status === 'Pending') return ['In Progress', 'Rejected'];
    if (status === 'In Progress') return ['Resolved'];
    return [];
  }

  openDetails(report: WasteReport): void {
    this.selectedReport = report;
  }

  closeDetails(): void {
    this.selectedReport = null;
  }

  changeStatus(report: WasteReport, status: WasteReportStatus): void {
    if (this.reportService.updateReportStatus(report.id, status)) {
      this.selectedReport = this.reports.find(item => item.id === report.id) || null;
      this.loadReports();
    }
  }

  private loadReports(): void {
    this.reports = this.reportService.getAllReports();
  }
}
