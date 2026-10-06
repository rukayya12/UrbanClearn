import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { ReportService } from './core/services/report.service';
import { SidebarComponent } from './shared/layouts/sidebar/sidebar.component';

describe('Report feature data', () => {
  let reportService: ReportService;
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
    reportService = new ReportService();
  });

  it('generates sequential report IDs and returns reports only to their submitter', () => {
    const first = reportService.createReport(
      'USER01',
      'Asha User',
      'Uncollected Waste',
      'Waste was not collected on the scheduled day.',
      'Stone Town market',
      new Date('2026-10-01T00:00:00')
    );
    const second = reportService.createReport(
      'USER02',
      'Juma User',
      'Illegal Dumping',
      'A pile of waste was left beside the road.',
      'Mlandege Road',
      new Date('2026-10-02T00:00:00')
    );

    expect(first.id).toBe('REP01');
    expect(second.id).toBe('REP02');
    expect(first.status).toBe('Pending');
    expect(reportService.getUserReports('USER01').map(report => report.id)).toEqual(['REP01']);
  });

  it('persists reports and enforces the Admin status transitions', () => {
    const report = reportService.createReport(
      'USER01',
      'Asha User',
      'Overflowing Waste',
      'The public bin has been overflowing for several days.',
      'Forodhani Gardens',
      new Date('2026-10-03T00:00:00')
    );

    expect(reportService.updateReportStatus(report.id, 'Resolved')).toBe(false);
    expect(reportService.updateReportStatus(report.id, 'In Progress')).toBe(true);
    expect(reportService.updateReportStatus(report.id, 'Rejected')).toBe(false);

    const reloadedService = new ReportService();
    expect(reloadedService.getReportById(report.id)?.status).toBe('In Progress');
    expect(reloadedService.updateReportStatus(report.id, 'Resolved')).toBe(true);
    expect(new ReportService().getReportById(report.id)?.status).toBe('Resolved');
  });

  it('exposes Report in the correct role menus and keeps Map out of the Normal User menu', () => {
    const authService = new AuthService();
    const router = { navigate: vi.fn() } as any;
    const userSidebar = new SidebarComponent(authService, router);
    (authService as any).currentUserSubject.next({ id: 'USER01', role: 'NORMAL_USER' });
    userSidebar.ngOnInit();

    expect(userSidebar.menuItems.map(item => item.label)).toEqual([
      'Dashboard', 'Request Collection', 'My Requests', 'Report', 'Notifications', 'Profile'
    ]);
    expect(userSidebar.menuItems.map(item => item.route)).toContain('/user/reports');
    expect(userSidebar.menuItems.map(item => item.route)).not.toContain('/user/map');
    userSidebar.ngOnDestroy();

    (authService as any).currentUserSubject.next({ id: 'ADMIN01', role: 'ADMIN' });
    const adminSidebar = new SidebarComponent(authService, router);
    adminSidebar.ngOnInit();
    expect(adminSidebar.menuItems.map(item => item.label)).toEqual([
      'Dashboard', 'Requests', 'Report', 'Map', 'Notifications', 'Profile'
    ]);
    expect(adminSidebar.menuItems.map(item => item.route)).toContain('/admin/reports');
    expect(adminSidebar.menuItems.map(item => item.route)).not.toContain('/admin/users');
    adminSidebar.ngOnDestroy();
  });

  it('registers separate report routes under the protected user and admin route groups', () => {
    const layoutRoute = routes.find(route => route.path === '' && route.children);
    const userRoutes = layoutRoute?.children?.find(route => route.path === 'user')?.children || [];
    const adminRoutes = layoutRoute?.children?.find(route => route.path === 'admin')?.children || [];

    expect(userRoutes.some(route => route.path === 'reports')).toBe(true);
    expect(adminRoutes.some(route => route.path === 'reports')).toBe(true);
    expect(userRoutes.some(route => route.path === 'map')).toBe(false);
  });
});