import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WasteReport, WasteReportStatus, WasteReportType } from '../models/request.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private reportsSubject = new BehaviorSubject<WasteReport[]>(this.getReportsFromStorage());
  public reports$ = this.reportsSubject.asObservable();

  createReport(
    reporterId: string,
    reporterName: string,
    reportType: WasteReportType,
    description: string,
    location: string,
    reportDate: Date
  ): WasteReport {
    const reports = this.getReportsFromStorage();
    const report: WasteReport = {
      id: this.generateNextReportId(reports),
      reporterId,
      reporterName,
      reportType,
      description,
      location,
      status: 'Pending',
      createdAt: reportDate
    };

    reports.push(report);
    this.saveReports(reports);

    return report;
  }

  getReportById(id: string): WasteReport | undefined {
    return this.getReportsFromStorage().find(r => r.id === id);
  }

  getUserReports(userId: string): WasteReport[] {
    return this.getReportsFromStorage()
      .filter(r => r.reporterId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateReportStatus(reportId: string, status: WasteReportStatus): boolean {
    const reports = this.getReportsFromStorage();
    const report = reports.find(r => r.id === reportId);

    if (!report || !this.canTransitionStatus(report.status, status)) {
      return false;
    }

    report.status = status;
    if (status === 'Resolved') {
      report.resolvedAt = new Date();
    }

    this.saveReports(reports);

    return true;
  }

  getAllReports(): WasteReport[] {
    return this.getReportsFromStorage()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  refreshReports(): void {
    this.reportsSubject.next(this.getReportsFromStorage());
  }

  private saveReports(reports: WasteReport[]): void {
    localStorage.setItem('urbanclean_reports', JSON.stringify(reports));
    this.reportsSubject.next([...reports]);
  }

  private generateNextReportId(reports: WasteReport[]): string {
    const maxId = reports.reduce((max, report) => {
      const match = /^REP(\d+)$/i.exec(report.id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `REP${String(maxId + 1).padStart(2, '0')}`;
  }

  private canTransitionStatus(current: WasteReportStatus, next: WasteReportStatus): boolean {
    return (current === 'Pending' && (next === 'In Progress' || next === 'Rejected'))
      || (current === 'In Progress' && next === 'Resolved');
  }

  private getReportsFromStorage(): WasteReport[] {
    const stored = localStorage.getItem('urbanclean_reports');
    if (!stored) {
      return [];
    }

    try {
      const data = JSON.parse(stored);
      if (!Array.isArray(data)) return [];

      return data.map((report: any): WasteReport => ({
        ...report,
        reportType: report.reportType || 'Other',
        location: typeof report.location === 'string' ? report.location : report.location?.address || '',
        status: this.normalizeStatus(report.status),
        createdAt: new Date(report.createdAt || Date.now()),
        resolvedAt: report.resolvedAt ? new Date(report.resolvedAt) : undefined
      }));
    } catch {
      return [];
    }
  }

  private normalizeStatus(status: string): WasteReportStatus {
    switch (status?.toLowerCase()) {
      case 'in progress':
      case 'in-progress':
      case 'under-review':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  }
}
