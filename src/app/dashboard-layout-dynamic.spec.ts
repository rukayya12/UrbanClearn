import '@angular/compiler';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { RequestService } from './core/services/request.service';
import { NotificationService } from './core/services/notification.service';
import { LocationService } from './core/services/location.service';
import { UserService } from './core/services/user.service';
import { SidebarComponent } from './shared/layouts/sidebar/sidebar.component';
import { DashboardComponent as UserDashboardComponent } from './features/user/dashboard/dashboard.component';
import { User } from './core/models/user.model';

describe('Dashboard Layout & Dynamic Data Verification', () => {
  let authService: AuthService;
  let requestService: RequestService;
  let notificationService: NotificationService;
  let locationService: LocationService;
  let userService: UserService;
  let mockRouter: any;

  beforeEach(() => {
    localStorage.clear();
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      url: '/user/dashboard'
    };
    authService = new AuthService();
    notificationService = new NotificationService();
    locationService = new LocationService();
    userService = new UserService();
    requestService = new RequestService(locationService, authService, userService, notificationService);
  });

  describe('PART 1 — Layout, Top Header & Sidebar Toggle', () => {
    it('should include Request Collection and Report for NORMAL_USER', () => {
      const sidebar = new SidebarComponent(authService, mockRouter);
      (authService as any).currentUserSubject.next({ role: 'NORMAL_USER' } as User);
      sidebar.ngOnInit();

      const labels = sidebar.menuItems.map(i => i.label);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('Request Collection');
      expect(labels).toContain('My Requests');
      expect(labels).toContain('Report');
      expect(labels).toContain('Notifications');
      expect(labels).toContain('Profile');

      const collectionItem = sidebar.menuItems.find(i => i.label === 'Request Collection');
      expect(collectionItem?.route).toBe('/user/request');
    });

    it('should show the requested ADMIN menu without Users', () => {
      const sidebar = new SidebarComponent(authService, mockRouter);
      (authService as any).currentUserSubject.next({ role: 'ADMIN' } as User);
      sidebar.ngOnInit();

      const routes = sidebar.menuItems.map(i => i.route);
      expect(routes).toContain('/admin/dashboard');
      expect(routes).toContain('/admin/requests');
      expect(routes).toContain('/admin/reports');
      expect(routes).toContain('/admin/map');
      expect(routes).toContain('/admin/notifications');
      expect(routes).toContain('/admin/profile');
      expect(routes).not.toContain('/admin/users');
    });
  });

  describe('PART 2 — Normal User Dashboard & Dynamic Data', () => {
    const defaultLocation = {
      latitude: -6.16,
      longitude: 35.74,
      address: 'Stone Town Seaside',
      region: 'Zanzibar',
      district: 'Urban',
      city: 'Zanzibar'
    };

    it('should isolate user-specific requests and calculate correct statistics without mixing other users', () => {
      const userA: User = {
        id: 'USER01',
        fullName: 'User A',
        email: 'userA@test.com',
        phone: '+255 777 000 002',
        password: 'Password123!',
        location: defaultLocation,
        role: 'NORMAL_USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      (authService as any).currentUserSubject.next(userA);

      const reqA1 = {
        id: 'REQ01',
        userId: 'USER01',
        userName: 'User A',
        wasteTypes: ['plastic' as const],
        location: { latitude: 0, longitude: 0, address: 'Loc A' },
        requestedTime: new Date(),
        status: 'pending' as const,
        statusHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const reqA2 = {
        id: 'REQ02',
        userId: 'USER01',
        userName: 'User A',
        wasteTypes: ['paper' as const],
        location: { latitude: 0, longitude: 0, address: 'Loc A' },
        requestedTime: new Date(),
        status: 'completed' as const,
        statusHistory: [],
        greenPoints: 40,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const reqB1 = {
        id: 'REQ03',
        userId: 'USER02',
        userName: 'User B',
        wasteTypes: ['glass' as const],
        location: { latitude: 0, longitude: 0, address: 'Loc B' },
        requestedTime: new Date(),
        status: 'completed' as const,
        statusHistory: [],
        greenPoints: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      localStorage.setItem('urbanclean_session', JSON.stringify(userA));
      localStorage.setItem('urbanclean_requests', JSON.stringify([reqA1, reqA2, reqB1]));
      (requestService as any).requestsSubject.next([reqA1, reqA2, reqB1]);

      const comp = new UserDashboardComponent(authService, requestService, notificationService, mockRouter);
      comp.ngOnInit();

      expect(comp.totalRequests).toBe(2);
      expect(comp.pendingRequests).toBe(1);
      expect(comp.completedRequests).toBe(1);
      expect(comp.greenPoints).toBe(40);
      expect(comp.ecoPoints).toBe(40);
      expect(comp.recentRequests.length).toBe(2);
      expect(comp.recentRequests.some(r => r.userId === 'USER02')).toBe(false);
    });
  });

  describe('PART 3 — Sequential Request and User IDs', () => {
    it('should generate sequential REQ01, REQ02 and USER01, USER02', async () => {
      const reg1 = await firstValueFrom(authService.register({
        fullName: 'User One',
        email: 'user1@test.com',
        phone: '0711111111',
        password: 'Password123!'
      }));
      expect(reg1.user?.id).toBe('USER01');

      const reg2 = await firstValueFrom(authService.register({
        fullName: 'User Two',
        email: 'user2@test.com',
        phone: '0722222222',
        password: 'Password123!'
      }));
      expect(reg2.user?.id).toBe('USER02');

      await firstValueFrom(authService.login('user1@test.com', 'Password123!'));

      const r1 = await firstValueFrom(requestService.createRequest(['plastic'], -6.16, 35.74, 'Loc 1', new Date()));
      expect(r1.requestId).toBe('REQ01');

      const r2 = await firstValueFrom(requestService.createRequest(['paper'], -6.16, 35.74, 'Loc 2', new Date()));
      expect(r2.requestId).toBe('REQ02');
    });
  });
});

