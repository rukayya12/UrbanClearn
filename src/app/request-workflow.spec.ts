import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationService } from './core/services/location.service';
import { NotificationService } from './core/services/notification.service';
import { RequestService } from './core/services/request.service';
import { UserService } from './core/services/user.service';
import { AuthService } from './core/services/auth.service';
import { SidebarComponent } from './shared/layouts/sidebar/sidebar.component';
import { routes } from './app.routes';
import { WasteRequest } from './core/models/request.model';

describe('Collection request lifecycle', () => {
  const storage = new Map<string, string>();
  let role: string;
  let currentUser: { id: string; role: string };
  let collectors: any[];
  let requestService: RequestService;

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });

    const preferredDate = '2099-10-10';
    const baseRequest: WasteRequest = {
      id: 'REQ01',
      userId: 'USER01',
      userName: 'Test User',
      userPhone: '',
      wasteTypes: ['plastic'],
      location: { latitude: -6.163, longitude: 39.189, address: 'Stone Town' },
      description: 'Household waste pickup',
      requestedTime: new Date(`${preferredDate}T10:00:00`),
      preferredDate,
      preferredTime: '10:00',
      status: 'pending',
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const conflictingRequest: WasteRequest = {
      ...baseRequest,
      id: 'REQ02',
      collectorId: 'COLLECTOR02',
      collectorName: 'Near Collector',
      status: 'scheduled',
      confirmedCollectionDate: preferredDate,
      confirmedCollectionTime: '10:00'
    };
    const laterAssignment: WasteRequest = {
      ...baseRequest,
      id: 'REQ03',
      collectorId: 'COLLECTOR01',
      collectorName: 'Nearby Collector',
      status: 'scheduled',
      confirmedCollectionDate: preferredDate,
      confirmedCollectionTime: '11:30'
    };
    storage.set('urbanclean_requests', JSON.stringify([baseRequest, conflictingRequest, laterAssignment]));

    collectors = [
      {
        id: 'COLLECTOR01', fullName: 'Nearby Collector', role: 'COLLECTOR', isActive: true, availability: 'available',
        location: { latitude: -6.17, longitude: 39.189, address: 'Stone Town West' }
      },
      {
        id: 'COLLECTOR02', fullName: 'Near Collector', role: 'COLLECTOR', isActive: true, availability: 'available',
        location: { latitude: -6.163, longitude: 39.189, address: 'Stone Town' }
      },
      {
        id: 'COLLECTOR03', fullName: 'No GPS Collector', role: 'COLLECTOR', isActive: true, availability: 'available',
        location: { latitude: 0, longitude: 0, address: 'Location not registered' }
      }
    ];
    role = 'ADMIN';
    currentUser = { id: 'ADMIN01', role };
    const auth = {
      getCurrentUser: () => currentUser,
      hasRole: (expected: string) => role === expected,
      hasAnyRole: (expected: string[]) => expected.includes(role)
    };
    const userService = { getCollectors: () => collectors };
    requestService = new RequestService(
      new LocationService(),
      auth as any,
      userService as any,
      new NotificationService()
    );
  });

  it('recommends the closest available Collector and reports real conflicts or unavailable distance', () => {
    const options = requestService.getCollectorRecommendations('REQ01');
    expect(options[0].collector.id).toBe('COLLECTOR01');
    expect(options[0].distanceMeters).toBeGreaterThan(0);
    expect(options.find(option => option.collector.id === 'COLLECTOR02')?.isAvailable).toBe(false);
    expect(options.find(option => option.collector.id === 'COLLECTOR02')?.conflictReason).toContain('REQ02');
    expect(options.find(option => option.collector.id === 'COLLECTOR03')?.distanceMeters).toBeNull();
  });

  it('requires Admin assignment, Collector proposal, and Admin approval before collection', () => {
    expect(requestService.assignCollector('REQ01', 'COLLECTOR02')).toBe(false);
    expect(requestService.assignCollector('REQ01', 'COLLECTOR01')).toBe(true);
    expect(requestService.getRequestById('REQ01')?.status).toBe('assigned');

    role = 'COLLECTOR';
    currentUser = { id: 'COLLECTOR01', role };
    expect(requestService.updateCollectionStatus('REQ01', 'on-the-way')).toBe(false);
    expect(requestService.proposeCollectionTime('REQ01', 'COLLECTOR01', '2099-10-10', '11:00')).toBe(false);
    expect(requestService.proposeCollectionTime('REQ01', 'COLLECTOR01', '2099-10-10', '13:00')).toBe(true);
    expect(requestService.approveProposedTime('REQ01')).toBe(false);

    role = 'ADMIN';
    currentUser = { id: 'ADMIN01', role };
    expect(requestService.requestDifferentTime('REQ01')).toBe(true);
    expect(requestService.getRequestById('REQ01')?.status).toBe('reschedule-required');

    role = 'COLLECTOR';
    currentUser = { id: 'COLLECTOR01', role };
    expect(requestService.proposeCollectionTime('REQ01', 'COLLECTOR01', '2099-10-10', '14:00')).toBe(true);
    role = 'ADMIN';
    currentUser = { id: 'ADMIN01', role };
    expect(requestService.approveProposedTime('REQ01')).toBe(true);
    expect(requestService.getRequestById('REQ01')).toMatchObject({
      status: 'scheduled',
      confirmedCollectionDate: '2099-10-10',
      confirmedCollectionTime: '14:00'
    });

    role = 'COLLECTOR';
    currentUser = { id: 'COLLECTOR01', role };
    expect(requestService.updateCollectionStatus('REQ01', 'on-the-way')).toBe(true);
    expect(requestService.updateCollectionStatus('REQ01', 'collected')).toBe(true);
    expect(requestService.updateCollectionStatus('REQ01', 'completed')).toBe(true);
    expect(new RequestService(
      new LocationService(),
      { ...({} as any), getCurrentUser: () => currentUser } as any,
      { getCollectors: () => collectors } as any,
      new NotificationService()
    ).getRequestById('REQ01')?.status).toBe('completed');
  });

  it('allows request creation without GPS coordinates and keeps the request Pending', async () => {
    storage.delete('urbanclean_requests');
    storage.delete('urbanclean_request_seq');
    role = 'NORMAL_USER';
    currentUser = { id: 'USER01', role };
    const result = await new Promise<{ success: boolean; requestId?: string }>(resolve => {
      requestService.createRequest(
        ['plastic'],
        0,
        0,
        'Stone Town',
        new Date('2099-10-10T10:00:00'),
        'Household waste pickup',
        '2099-10-10',
        '10:00'
      ).subscribe(resolve);
    });

    expect(result).toMatchObject({ success: true, requestId: 'REQ01' });
    expect(requestService.getRequestById('REQ01')).toMatchObject({
      status: 'pending',
      preferredDate: '2099-10-10',
      preferredTime: '10:00',
      location: { latitude: 0, longitude: 0 }
    });
  });

  it('keeps role menus scoped and exposes Map only in Admin route groups', () => {
    const authService = new AuthService();
    const router = { navigate: vi.fn() } as any;
    const getMenu = (userRole: string) => {
      (authService as any).currentUserSubject.next({ id: `${userRole}01`, role: userRole });
      const sidebar = new SidebarComponent(authService, router);
      sidebar.ngOnInit();
      const menu = sidebar.menuItems.map(item => item.label);
      sidebar.ngOnDestroy();
      return menu;
    };

    expect(getMenu('COLLECTOR')).toEqual([
      'Dashboard', 'Assigned Collections', 'Collection History', 'Notifications', 'Profile'
    ]);
    expect(getMenu('RECYCLING_CENTRE')).toEqual([
      'Dashboard', 'Recycling Requests', 'Recycling History', 'Notifications', 'Profile'
    ]);

    const layout = routes.find(route => route.path === '' && route.children);
    const children = layout?.children || [];
    expect(children.find(route => route.path === 'admin')?.children?.some(route => route.path === 'map')).toBe(true);
    expect(children.find(route => route.path === 'collector')?.children?.some(route => route.path === 'map')).toBe(false);
    expect(children.find(route => route.path === 'centre')?.children?.some(route => route.path === 'map')).toBe(false);
  });

  it('creates sequential Collector IDs and preserves Collector identity and coordinates in storage', async () => {
    const authService = new AuthService();
    const userService = new UserService();
    const collector = userService.addCollector({
      fullName: 'Registered Collector',
      email: 'registered.collector@example.com',
      phone: '0712345678',
      password: 'CollectorPass123!',
      address: 'Stone Town',
      latitude: -6.163,
      longitude: 39.189,
      availability: 'available'
    });

    expect(collector?.id).toBe('COLLECTOR01');
    expect(userService.getUserById('COLLECTOR01')?.role).toBe('COLLECTOR');
    expect(userService.getUserById('COLLECTOR01')?.location.longitude).toBe(39.189);
    await new Promise<void>(resolve => {
      authService.login('registered.collector@example.com', 'CollectorPass123!').subscribe(() => resolve());
    });
    expect(authService.getCurrentUser()?.id).toBe('COLLECTOR01');
    expect(JSON.parse(storage.get('urbanclean_users') || '[]').find((user: any) => user.email === 'registered.collector@example.com')?.id).toBe('COLLECTOR01');
  });
});