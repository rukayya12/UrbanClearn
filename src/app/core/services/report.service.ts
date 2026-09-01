import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WasteReport, RequestPriority } from '../models/request.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private reportsSubject = new BehaviorSubject<WasteReport[]>(this.getReportsFromStorage());
  public reports$ = this.reportsSubject.asObservable();

  constructor() {}

  createReport(
    reporterId: string,
    reporterName: string,
    description: string,
    priority: RequestPriority,
    latitude: number,
    longitude: number,
    address: string,
    imageUrl?: string
  ): WasteReport {
    const report: WasteReport = {
      id: `report-${Date.now()}`,
      reporterId,
      reporterName,
      description,
      priority,
      location: {
        latitude,
        longitude,
        address
      },
      imageUrl,
      status: 'pending',
      createdAt: new Date()
    };

    const reports = this.getReportsFromStorage();
    reports.push(report);
    localStorage.setItem('urbanclean_reports', JSON.stringify(reports));
    this.reportsSubject.next(reports);

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

  getReportsByStatus(status: string): WasteReport[] {
    return this.getReportsFromStorage().filter(r => r.status === status);
  }

  getReportsByPriority(priority: RequestPriority): WasteReport[] {
    return this.getReportsFromStorage().filter(r => r.priority === priority);
  }

  updateReportStatus(reportId: string, status: 'pending' | 'under-review' | 'resolved'): boolean {
    const reports = this.getReportsFromStorage();
    const report = reports.find(r => r.id === reportId);

    if (!report) {
      return false;
    }

    report.status = status;
    if (status === 'resolved') {
      report.resolvedAt = new Date();
    }

    localStorage.setItem('urbanclean_reports', JSON.stringify(reports));
    this.reportsSubject.next(reports);

    return true;
  }

  getAllReports(): WasteReport[] {
    return this.getReportsFromStorage();
  }

  getStats(): {
    total: number;
    pending: number;
    underReview: number;
    resolved: number;
    criticalCount: number;
    highCount: number;
  } {
    const reports = this.getReportsFromStorage();
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      underReview: reports.filter(r => r.status === 'under-review').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      criticalCount: reports.filter(r => r.priority === 'critical').length,
      highCount: reports.filter(r => r.priority === 'high').length
    };
  }

  deleteReport(reportId: string): boolean {
    const reports = this.getReportsFromStorage();
    const index = reports.findIndex(r => r.id === reportId);

    if (index === -1) {
      return false;
    }

    reports.splice(index, 1);
    localStorage.setItem('urbanclean_reports', JSON.stringify(reports));
    this.reportsSubject.next(reports);

    return true;
  }

  private getReportsFromStorage(): WasteReport[] {
    const stored = localStorage.getItem('urbanclean_reports');
    if (stored) {
      const data = JSON.parse(stored);
      return data.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : undefined
      }));
    }
    return [];
  }
}
