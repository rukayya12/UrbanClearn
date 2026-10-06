import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ReportService } from '../../../core/services/report.service';
import { WasteReport, WasteReportType } from '../../../core/models/request.model';

@Component({
  selector: 'app-user-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="reports-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">COMMUNITY REPORTS</span>
          <h1>Report a Waste Issue</h1>
          <p>Tell UrbanClean about waste issues in your area and track their progress.</p>
        </div>
      </header>

      <div class="content-grid">
        <section class="panel form-panel">
          <div class="panel-heading">
            <h2>Submit a report</h2>
            <span class="status-note">New reports start as Pending</span>
          </div>

          <div *ngIf="successMessage" class="feedback success" role="status">{{ successMessage }}</div>
          <div *ngIf="errorMessage" class="feedback error" role="alert">{{ errorMessage }}</div>

          <form #reportForm="ngForm" (ngSubmit)="submitReport(reportForm)" novalidate>
            <div class="field">
              <label for="reportType">Report Type <span>*</span></label>
              <select id="reportType" name="reportType" [(ngModel)]="reportType" required #typeField="ngModel">
                <option value="">Choose a report type</option>
                <option *ngFor="let type of reportTypes" [value]="type">{{ type }}</option>
              </select>
              <small *ngIf="typeField.invalid && (typeField.touched || submitted)">Choose a report type.</small>
            </div>

            <div class="field">
              <label for="description">Description <span>*</span></label>
              <textarea id="description" name="description" [(ngModel)]="description" required minlength="10" maxlength="1000" rows="4" placeholder="Describe what happened and any helpful details" #descriptionField="ngModel"></textarea>
              <small *ngIf="descriptionField.invalid && (descriptionField.touched || submitted)">
                Enter a description between 10 and 1000 characters.
              </small>
            </div>

            <div class="field">
              <label for="location">Location <span>*</span></label>
              <input id="location" name="location" [(ngModel)]="location" required maxlength="200" placeholder="Street, landmark, or area" #locationField="ngModel" />
              <small *ngIf="locationField.invalid && (locationField.touched || submitted)">Enter the issue location.</small>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="reportDate">Date <span>*</span></label>
                <input id="reportDate" name="reportDate" type="date" [(ngModel)]="reportDate" required [max]="today" #dateField="ngModel" />
                <small *ngIf="dateField.invalid && (dateField.touched || submitted)">Choose a valid date.</small>
              </div>
              <div class="field status-field">
                <label>Status</label>
                <div class="status-preview">Pending</div>
              </div>
            </div>

            <button class="submit-button" type="submit">Submit Report</button>
          </form>
        </section>

        <section class="history-section">
          <div class="history-heading">
            <div>
              <span class="eyebrow">YOUR SUBMISSIONS</span>
              <h2>Report History</h2>
            </div>
            <span class="count-badge">{{ reports.length }}</span>
          </div>

          <div *ngIf="reports.length === 0" class="empty-state">
            <span class="empty-icon">📍</span>
            <h3>No reports yet</h3>
            <p>Reports you submit will appear here with their latest status.</p>
          </div>

          <article *ngFor="let report of reports" class="report-card">
            <div class="card-topline">
              <span class="report-id">{{ report.id }}</span>
              <span class="status-badge" [ngClass]="statusClass(report.status)">{{ report.status }}</span>
            </div>
            <h3>{{ report.reportType }}</h3>
            <p class="report-description">{{ report.description }}</p>
            <div class="report-meta">
              <span>📍 {{ report.location }}</span>
              <time>{{ report.createdAt | date:'mediumDate' }}</time>
            </div>
          </article>
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; color: #17211B; }
    .reports-page { max-width: 1180px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .eyebrow { color: #15803D; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
    h1 { margin: 6px 0; font-size: 28px; }
    .page-header p, .report-description, .empty-state p { color: #64748B; line-height: 1.5; }
    .content-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .9fr); gap: 22px; align-items: start; }
    .panel, .report-card, .empty-state { background: #fff; border: 1px solid #DCE8DF; border-radius: 8px; box-shadow: 0 5px 18px rgba(21, 128, 61, .06); }
    .form-panel { padding: 22px; }
    .panel-heading, .history-heading, .card-topline, .report-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h2 { margin: 0; font-size: 19px; }
    .status-note { color: #64748B; font-size: 12px; }
    form { display: grid; gap: 16px; margin-top: 20px; }
    .field { display: grid; gap: 6px; min-width: 0; }
    label { color: #34423A; font-size: 13px; font-weight: 700; }
    label span, .field small { color: #B42318; }
    input, select, textarea { width: 100%; min-height: 42px; padding: 10px 12px; border: 1px solid #C8D5CC; border-radius: 5px; background: #fff; color: #17211B; font: inherit; }
    textarea { resize: vertical; }
    input:focus, select:focus, textarea:focus { outline: 2px solid #86EFAC; border-color: #15803D; }
    .field small { font-size: 12px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .status-preview { min-height: 42px; display: flex; align-items: center; padding: 0 12px; border-radius: 5px; background: #FFF7E6; color: #8A5A00; font-size: 13px; font-weight: 700; }
    .submit-button { min-height: 44px; padding: 10px 16px; border: 0; border-radius: 5px; background: #15803D; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
    .submit-button:hover { background: #166534; }
    .feedback { margin-top: 16px; padding: 11px 13px; border-radius: 5px; font-size: 13px; }
    .success { background: #DCFCE7; color: #166534; }
    .error { background: #FEE4E2; color: #912018; }
    .history-section { display: grid; gap: 12px; }
    .history-heading { margin: 1px 0 4px; }
    .history-heading h2 { margin-top: 5px; }
    .count-badge { min-width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: #DCFCE7; color: #166534; font-weight: 800; }
    .report-card { padding: 16px; }
    .report-id { color: #166534; font-size: 12px; font-weight: 800; }
    .status-badge { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .status-pending { background: #FFF7E6; color: #8A5A00; }
    .status-progress { background: #E0F2FE; color: #075985; }
    .status-resolved { background: #DCFCE7; color: #166534; }
    .status-rejected { background: #FEE4E2; color: #912018; }
    .report-card h3 { margin: 12px 0 5px; font-size: 16px; }
    .report-description { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
    .report-meta { margin-top: 13px; color: #64748B; font-size: 12px; }
    .report-meta span { overflow-wrap: anywhere; }
    .empty-state { padding: 28px 18px; text-align: center; }
    .empty-icon { font-size: 26px; }
    .empty-state h3 { margin: 10px 0 5px; }
    .empty-state p { margin: 0; font-size: 13px; }
    @media (max-width: 760px) { .content-grid { grid-template-columns: 1fr; } }
    @media (max-width: 480px) { .form-panel { padding: 16px; } .field-row { grid-template-columns: 1fr; } .panel-heading { align-items: flex-start; flex-direction: column; } .report-meta { align-items: flex-start; flex-direction: column; } }
  `]
})
export class ReportsComponent implements OnInit, OnDestroy {
  readonly reportTypes: WasteReportType[] = [
    'Uncollected Waste',
    'Overflowing Waste',
    'Illegal Dumping',
    'Waste Collection Problem',
    'Other'
  ];
  readonly today = new Date().toISOString().slice(0, 10);
  reportType: WasteReportType | '' = '';
  description = '';
  location = '';
  reportDate = this.today;
  reports: WasteReport[] = [];
  errorMessage = '';
  successMessage = '';
  submitted = false;
  private userId = '';
  private subscription?: Subscription;

  constructor(private authService: AuthService, private reportService: ReportService) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.userId = user?.id || '';
    this.location = user?.location?.address || '';
    this.reportService.refreshReports();
    this.loadReports();
    this.subscription = this.reportService.reports$.subscribe(() => this.loadReports());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  submitReport(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';
    if (form.invalid || !this.userId || !this.reportType) {
      form.control.markAllAsTouched();
      this.errorMessage = this.userId ? 'Check the highlighted fields and try again.' : 'Your session could not be verified. Please sign in again.';
      return;
    }

    const user = this.authService.getCurrentUser();
    const report = this.reportService.createReport(
      this.userId,
      user?.fullName || 'Normal User',
      this.reportType,
      this.description.trim(),
      this.location.trim(),
      new Date(`${this.reportDate}T00:00:00`)
    );
    this.successMessage = `Report ${report.id} submitted successfully.`;
    this.reportType = '';
    this.description = '';
    this.reportDate = this.today;
    this.submitted = false;
    form.control.markAllAsTouched();
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replace(' ', '-') === 'in-progress' ? 'progress' : status.toLowerCase()}`;
  }

  private loadReports(): void {
    this.reports = this.userId ? this.reportService.getUserReports(this.userId) : [];
  }
}
