import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { LocationService } from './core/services/location.service';
import { NotificationService } from './core/services/notification.service';
import { RequestService } from './core/services/request.service';
import { UserService } from './core/services/user.service';
import { AuthService } from './core/services/auth.service';
import { SidebarComponent } from './shared/layouts/sidebar/sidebar.component';
import { routes } from './app.routes';
import { WasteRequest } from './core/models/request.model';
import { RequestsComponent as CollectorRequestsComponent } from './features/collector/requests/requests.component';
import { HistoryComponent as CollectorHistoryComponent } from './features/collector/history/history.component';
import { RequestsComponent as RecyclingRequestsComponent } from './features/recycling-centre/requests/requests.component';
import { DashboardComponent as RecyclingCentreDashboardComponent } from './features/recycling-centre/dashboard/dashboard.component';
import { RecyclingComponent as RecyclingHistoryComponent } from './features/recycling-centre/recycling/recycling.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { RecyclingCentreGuard } from './core/guards/auth.guard';
import { formatDateOnly, formatTime12Hour, formatTanzaniaInstant, getTanzaniaDateTime, isFutureTanzaniaDateTime, tanzaniaDateTimeToDate } from './core/utils/tanzania-date-time';

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

  it('formats and validates dates in Tanzania time without shifting selected wall time', () => {
    const instant = new Date('2026-10-10T08:00:00.000Z');
    expect(getTanzaniaDateTime(instant)).toEqual({ date: '2026-10-10', time: '11:00' });
    expect(formatDateOnly('2026-10-10')).toBe('10/10/2026');
    expect(formatTime12Hour('11:00')).toBe('11:00 AM');
    expect(formatTanzaniaInstant(instant)).toBe('10/10/2026 at 11:00 AM');
    expect(tanzaniaDateTimeToDate('2026-10-10', '11:00')?.toISOString()).toBe(instant.toISOString());
    expect(isFutureTanzaniaDateTime('2026-10-10', '11:00', new Date('2026-10-10T07:59:00Z'))).toBe(true);
    expect(isFutureTanzaniaDateTime('2026-10-10', '11:00', instant)).toBe(false);
    expect(isFutureTanzaniaDateTime('2026-10-09', '11:00', instant)).toBe(false);
  });

  it('rejects past Tanzania collection times and rechecks them when Admin approves', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-10T08:00:00.000Z'));
      expect(requestService.assignCollector('REQ01', 'COLLECTOR01')).toBe(true);
      role = 'COLLECTOR';
      currentUser = { id: 'COLLECTOR01', role };
      expect(requestService.proposeCollectionTime('REQ01', 'COLLECTOR01', '2026-10-10', '10:59')).toBe(false);
      expect(requestService.proposeCollectionTime('REQ01', 'COLLECTOR01', '2026-10-10', '11:00')).toBe(false);
      expect(requestService.proposeCollectionTime('REQ01', 'COLLECTOR01', '2026-10-10', '11:01')).toBe(true);

      role = 'ADMIN';
      currentUser = { id: 'ADMIN01', role };
      vi.setSystemTime(new Date('2026-10-10T08:02:00.000Z'));
      expect(requestService.approveProposedTime('REQ01')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('creates independent sequential requests across users and retains IDs after service reload', async () => {
    storage.delete('urbanclean_requests');
    storage.delete('urbanclean_request_seq');
    role = 'NORMAL_USER';
    currentUser = { id: 'USER01', role };
    const create = (address: string, wasteType: 'organic' | 'plastic') => new Promise<{ requestId?: string }>(resolve => {
      requestService.createRequest([wasteType], 0, 0, address, new Date(), `${address} waste`).subscribe(resolve);
    });

    const first = await create('Stone Town', 'organic');
    const second = await create('Bububu', 'plastic');
    currentUser = { id: 'USER02', role };
    const third = await create('Mwera', 'plastic');
    const reloadedService = new RequestService(
      new LocationService(),
      { getCurrentUser: () => currentUser, hasRole: (expected: string) => role === expected, hasAnyRole: (expected: string[]) => expected.includes(role) } as any,
      { getCollectors: () => collectors } as any,
      new NotificationService()
    );
    const fourth = await new Promise<{ requestId?: string }>(resolve => {
      reloadedService.createRequest(['paper'], 0, 0, 'Kiembe Samaki', new Date(), 'Paper waste').subscribe(resolve);
    });

    expect([first.requestId, second.requestId, third.requestId, fourth.requestId]).toEqual(['REQ01', 'REQ02', 'REQ03', 'REQ04']);
    expect(reloadedService.getUserRequests('USER01').map(request => request.location.address)).toEqual(['Stone Town', 'Bububu']);
    expect(reloadedService.getUserRequests('USER02').map(request => request.id)).toEqual(['REQ03', 'REQ04']);
    expect(reloadedService.getRequestById('REQ01')?.wasteTypes).toEqual(['organic']);
    expect(reloadedService.getRequestById('REQ02')?.wasteTypes).toEqual(['plastic']);
    const codes = ['REQ01', 'REQ02', 'REQ03', 'REQ04'].map(id => reloadedService.getRequestById(id)?.collectionVerificationCode);
    expect(codes.every(code => /^UC-\d{4,}$/.test(code || ''))).toBe(true);
    expect(new Set(codes).size).toBe(4);
    expect(reloadedService.getUserRequests('USER01').every(request => !request.collectionVerificationCode)).toBe(true);
    let sharedRequests: WasteRequest[] = [];
    const requestsSubscription = reloadedService.requests$.subscribe(requests => sharedRequests = requests);
    expect(sharedRequests.every(request => !request.collectionVerificationCode)).toBe(true);
    requestsSubscription.unsubscribe();
  });

  it('keeps Collector History scoped to completed requests owned by that Collector', () => {
    const completedForOne: WasteRequest = {
      ...JSON.parse(JSON.stringify(requestService.getRequestById('REQ01'))),
      status: 'completed',
      collectorId: 'COLLECTOR01',
      collectorName: 'Collector One',
      assignedCollectorId: 'COLLECTOR01',
      assignedCollectorName: 'Collector One',
      confirmedCollectionDate: '2026-10-10',
      confirmedCollectionTime: '11:00',
      verifiedAt: new Date('2026-10-10T08:08:00.000Z'),
      verifiedByCollector: 'COLLECTOR01',
      completedAt: new Date('2026-10-10T08:35:00.000Z'),
      completionTime: new Date('2026-10-10T08:35:00.000Z')
    };
    const scheduledForOne: WasteRequest = {
      ...completedForOne,
      id: 'REQ02',
      status: 'scheduled',
      completedAt: undefined,
      completionTime: undefined
    };
    const completedForTwo: WasteRequest = {
      ...completedForOne,
      id: 'REQ03',
      collectorId: 'COLLECTOR02',
      collectorName: 'Collector Two',
      assignedCollectorId: 'COLLECTOR02',
      assignedCollectorName: 'Collector Two'
    };
    storage.set('urbanclean_requests', JSON.stringify([completedForOne, scheduledForOne, completedForTwo]));

    currentUser = { id: 'COLLECTOR01', role: 'COLLECTOR' };
    const firstHistory = new CollectorHistoryComponent({ getCurrentUser: () => currentUser } as any, requestService);
    expect(firstHistory.completedRequests.map(request => request.id)).toEqual(['REQ01']);
    expect(firstHistory.collectionDate(firstHistory.completedRequests[0])).toBe('10/10/2026');
    expect(firstHistory.collectionTime(firstHistory.completedRequests[0])).toBe('11:00 AM');
    expect(firstHistory.formatTanzaniaInstant(firstHistory.completedRequests[0].verifiedAt)).toBe('10/10/2026 at 11:08 AM');
    expect(firstHistory.formatTanzaniaInstant(firstHistory.completedRequests[0].completedAt)).toBe('10/10/2026 at 11:35 AM');
    firstHistory.viewDetails(firstHistory.completedRequests[0]);
    expect(firstHistory.selectedRequest?.id).toBe('REQ01');
    expect(firstHistory.selectedRequest?.collectionVerificationCode).toBeUndefined();
    firstHistory.closeDetails();
    expect(firstHistory.selectedRequest).toBeNull();
    role = 'COLLECTOR';
    currentUser = { id: 'COLLECTOR01', role };
    const storedRequests = JSON.parse(storage.get('urbanclean_requests') || '[]');
    storedRequests.find((request: WasteRequest) => request.id === 'REQ02').status = 'collected';
    storage.set('urbanclean_requests', JSON.stringify(storedRequests));
    expect(firstHistory.completedRequests.map(request => request.id)).toEqual(['REQ01']);
    expect(requestService.updateCollectionStatus('REQ02', 'completed')).toBe(true);
    expect(firstHistory.completedRequests.map(request => request.id)).toEqual(['REQ01', 'REQ02']);
    firstHistory.ngOnDestroy();

    currentUser = { id: 'COLLECTOR02', role: 'COLLECTOR' };
    const secondHistory = new CollectorHistoryComponent({ getCurrentUser: () => currentUser } as any, requestService);
    expect(secondHistory.completedRequests.map(request => request.id)).toEqual(['REQ03']);
    secondHistory.ngOnDestroy();
  });

  it('completes collected requests from Assigned Collections and updates History and localStorage', () => {
    const collectedRequest: WasteRequest = {
      ...JSON.parse(JSON.stringify(requestService.getRequestById('REQ01'))),
      id: 'REQ01',
      collectorId: 'COLLECTOR01',
      collectorName: 'Collector One',
      assignedCollectorId: 'COLLECTOR01',
      assignedCollectorName: 'Collector One',
      status: 'collected',
      confirmedCollectionDate: '2026-10-10',
      confirmedCollectionTime: '11:00',
      verifiedAt: new Date('2026-10-10T08:08:00.000Z'),
      verifiedByCollector: 'COLLECTOR01'
    };
    storage.set('urbanclean_requests', JSON.stringify([collectedRequest]));
    role = 'COLLECTOR';
    currentUser = { id: 'COLLECTOR01', role };
    const auth = { getCurrentUser: () => currentUser } as any;
    const assignedPage = new CollectorRequestsComponent(auth, requestService);
    const historyPage = new CollectorHistoryComponent(auth, requestService);

    expect(assignedPage.nextStatus('collected')).toBe('completed');
    expect(assignedPage.requests.map(request => request.id)).toContain('REQ01');
    assignedPage.advanceStatus(assignedPage.requests[0], 'completed');

    const storedRequests: WasteRequest[] = JSON.parse(storage.get('urbanclean_requests') || '[]');
    expect(storedRequests).toHaveLength(1);
    expect(storedRequests[0]).toMatchObject({
      id: 'REQ01',
      status: 'completed',
      recyclingStatus: 'ready-for-recycling',
      collectorId: 'COLLECTOR01'
    });
    expect(storedRequests[0].completedAt).toBeTruthy();
    expect(storedRequests[0].completionTime).toBeTruthy();
    expect(assignedPage.requests.map(request => request.id)).not.toContain('REQ01');
    expect(assignedPage.completionMessage).toBe('Collection completed successfully.');
    expect(historyPage.completedRequests.map(request => request.id)).toEqual(['REQ01']);

    assignedPage.ngOnDestroy();
    historyPage.ngOnDestroy();
  });

  it('routes completed collections through the independent Recycling Centre workflow', () => {
    const completedOne: WasteRequest = {
      ...JSON.parse(JSON.stringify(requestService.getRequestById('REQ01'))),
      id: 'REQ01',
      collectorId: 'COLLECTOR01',
      collectorName: 'Collector One',
      assignedCollectorId: 'COLLECTOR01',
      assignedCollectorName: 'Collector One',
      status: 'completed',
      completedAt: new Date('2026-10-10T08:15:00.000Z'),
      completionTime: new Date('2026-10-10T08:15:00.000Z')
    };
    const completedTwo: WasteRequest = { ...completedOne, id: 'REQ02', recyclingStatus: undefined };
    const completedThree: WasteRequest = { ...completedOne, id: 'REQ05', recyclingStatus: undefined };
    const notCompleted: WasteRequest = { ...completedOne, id: 'REQ03', status: 'collected' };
    const assignedElsewhere: WasteRequest = {
      ...completedOne,
      id: 'REQ04',
      collectorId: 'COLLECTOR02',
      assignedCollectorId: 'COLLECTOR02',
      recyclingCentreId: 'CENTRE02',
      recyclingStatus: 'accepted'
    };
    storage.set('urbanclean_requests', JSON.stringify([completedOne, completedTwo, notCompleted, assignedElsewhere, completedThree]));
    role = 'RECYCLING_CENTRE';
    currentUser = { id: 'CENTRE01', role };
    const auth = { getCurrentUser: () => currentUser } as any;
    const route = { queryParamMap: of({ get: (key: string) => key === 'requestId' ? 'REQ01' : null }) } as any;
    const page = new RecyclingRequestsComponent(auth, requestService, route);
    const dashboard = new RecyclingCentreDashboardComponent(auth, requestService);
    const recyclingHistory = new RecyclingHistoryComponent(auth, requestService);

    expect(page.requests.map(request => request.id)).toEqual(['REQ01', 'REQ02', 'REQ05']);
    expect(recyclingHistory.statusFilter).toBe('recycled');
    expect(recyclingHistory.filteredRequests).toEqual([]);
    expect(page.selectedRequest?.id).toBe('REQ01');
    expect(dashboard.totalRequests).toBe(3);
    expect(dashboard.readyRequests).toBe(3);
    expect(page.requests[0].recyclingStatus).toBe('ready-for-recycling');
    expect(requestService.updateRecyclingStatus('REQ01', 'CENTRE01', 'processing')).toBe(false);
    expect(new NotificationService().getUserNotifications('CENTRE01')).toEqual([]);
    page.updateStatus(page.requests[0], 'accepted');
    expect(requestService.getRequestById('REQ01')).toMatchObject({
      status: 'completed',
      recyclingStatus: 'accepted',
      recyclingCentreId: 'CENTRE01'
    });
    let centreNotifications = new NotificationService().getUserNotifications('CENTRE01');
    expect(centreNotifications.map(notification => notification.message)).toEqual([
      'Recycling request REQ01 has been accepted.'
    ]);
    expect(centreNotifications[0]).toMatchObject({ userId: 'CENTRE01', recipientRole: 'RECYCLING_CENTRE', requestId: 'REQ01' });
    expect(requestService.updateRecyclingStatus('REQ01', 'CENTRE01', 'accepted')).toBe(false);
    expect(new NotificationService().getUserNotifications('CENTRE01')).toHaveLength(1);
    expect(requestService.getRecyclingRequests('CENTRE02').map(request => request.id)).not.toContain('REQ01');
    expect(dashboard.acceptedRequests).toBe(1);
    expect(dashboard.readyRequests).toBe(2);
    currentUser = { id: 'CENTRE02', role: 'RECYCLING_CENTRE' };
    expect(requestService.updateRecyclingStatus('REQ01', 'CENTRE02', 'processing')).toBe(false);
    currentUser = { id: 'CENTRE01', role: 'RECYCLING_CENTRE' };

    page.updateStatus(requestService.getRequestById('REQ01')!, 'processing');
    expect(requestService.getRequestById('REQ01')?.recyclingProcessingStartedAt).toBeTruthy();
    centreNotifications = new NotificationService().getUserNotifications('CENTRE01');
    expect(centreNotifications.map(notification => notification.message)).toEqual(expect.arrayContaining([
      'Recycling request REQ01 is now being processed.',
      'Recycling request REQ01 has been accepted.'
    ]));
    expect(centreNotifications).toHaveLength(2);
    expect(dashboard.processingRequests).toBe(1);
    page.updateStatus(requestService.getRequestById('REQ01')!, 'recycled');
    expect(dashboard.recycledRequests).toBe(1);
    centreNotifications = new NotificationService().getUserNotifications('CENTRE01');
    expect(centreNotifications.map(notification => notification.message)).toEqual(expect.arrayContaining([
      'Recycling request REQ01 has been marked as recycled.',
      'Recycling request REQ01 is now being processed.',
      'Recycling request REQ01 has been accepted.'
    ]));
    expect(centreNotifications).toHaveLength(3);
    expect(recyclingHistory.filteredRequests.map(request => request.id)).toEqual(['REQ01']);
    expect(recyclingHistory.filteredRequests[0].status).toBe('completed');

    page.openRejection(requestService.getRequestById('REQ02')!);
    page.rejectionReason = 'Material cannot be processed at this facility.';
    page.rejectRequest();
    centreNotifications = new NotificationService().getUserNotifications('CENTRE01');
    expect(centreNotifications.map(notification => notification.message)).toEqual(expect.arrayContaining([
      'Recycling request REQ02 has been rejected.',
      'Recycling request REQ01 has been marked as recycled.',
      'Recycling request REQ01 is now being processed.',
      'Recycling request REQ01 has been accepted.'
    ]));
    expect(centreNotifications).toHaveLength(4);
    expect(recyclingHistory.filteredRequests.map(request => request.id)).toEqual(['REQ01']);
    recyclingHistory.setStatusFilter('rejected');
    expect(recyclingHistory.filteredRequests.map(request => request.id)).toEqual(['REQ02']);
    recyclingHistory.setStatusFilter('all');
    expect(recyclingHistory.filteredRequests.map(request => request.id)).toEqual(['REQ01', 'REQ02']);

    const persisted: WasteRequest[] = JSON.parse(storage.get('urbanclean_requests') || '[]');
    expect(persisted).toHaveLength(5);
    expect(persisted.find(request => request.id === 'REQ01')).toMatchObject({
      status: 'completed',
      recyclingStatus: 'recycled',
      recyclingCentreId: 'CENTRE01'
    });
    expect(persisted.find(request => request.id === 'REQ01')?.recycledAt).toBeTruthy();
    expect(recyclingHistory.formatInstant(persisted.find(request => request.id === 'REQ01')?.recycledAt)).not.toBe('Not recorded');
    expect(persisted.find(request => request.id === 'REQ02')).toMatchObject({
      status: 'completed',
      recyclingStatus: 'rejected',
      recyclingRejectionReason: 'Material cannot be processed at this facility.'
    });
    expect(persisted.find(request => request.id === 'REQ02')?.recyclingRejectedAt).toBeTruthy();
    expect(dashboard.rejectedRequests).toBe(1);
    expect(dashboard.readyRequests).toBe(1);
    expect(requestService.getRecyclingRequests('CENTRE01').map(request => request.id)).toEqual(['REQ01', 'REQ02', 'REQ05']);
    const reloadedService = new RequestService(
      new LocationService(),
      { getCurrentUser: () => currentUser, hasRole: (expected: string) => currentUser.role === expected } as any,
      { getCollectors: () => collectors } as any,
      new NotificationService()
    );
    expect(reloadedService.getRequestById('REQ01')).toMatchObject({ status: 'completed', recyclingStatus: 'recycled' });
    expect(reloadedService.getRequestById('REQ01')?.recycledAt).toBeTruthy();

    const notificationsPage = new NotificationsComponent(auth, new NotificationService());
    notificationsPage.ngOnInit();
    expect(notificationsPage.notifications.map(notification => notification.message)).toEqual(centreNotifications.map(notification => notification.message));

    role = 'COLLECTOR';
    currentUser = { id: 'COLLECTOR01', role };
    const collectorHistory = new CollectorHistoryComponent(auth, requestService);
    expect(collectorHistory.completedRequests.map(request => request.id)).toContain('REQ01');
    expect(collectorHistory.completedRequests.find(request => request.id === 'REQ01')?.status).toBe('completed');
    collectorHistory.ngOnDestroy();

    page.ngOnDestroy();
    dashboard.ngOnDestroy();
    recyclingHistory.ngOnDestroy();
  });

  it('logs into the seeded Recycling Centre account, restores its session, and guards Centre routes', async () => {
    const authService = new AuthService();
    const storedUsers = JSON.parse(storage.get('urbanclean_users') || '[]');
    const centres = storedUsers.filter((user: { role: string }) => user.role === 'RECYCLING_CENTRE');
    expect(centres).toHaveLength(1);
    expect(centres[0]).toMatchObject({
      id: 'RECYCLING01',
      email: 'recycling01@urbanclean.com',
      role: 'RECYCLING_CENTRE'
    });

    const login = await new Promise<{ success: boolean }>(resolve => {
      authService.login('recycling01@urbanclean.com', '123456').subscribe(resolve);
    });
    expect(login.success).toBe(true);
    expect(authService.getCurrentUser()).toMatchObject({ id: 'RECYCLING01', role: 'RECYCLING_CENTRE' });
    expect(new UserService().getUserById('RECYCLING01')?.role).toBe('RECYCLING_CENTRE');
    expect(JSON.parse(storage.get('urbanclean_session') || '{}')).toMatchObject({
      id: 'RECYCLING01',
      role: 'RECYCLING_CENTRE'
    });

    const restoredAuthService = new AuthService();
    expect(restoredAuthService.getCurrentUser()).toMatchObject({ id: 'RECYCLING01', role: 'RECYCLING_CENTRE' });
    expect(JSON.parse(storage.get('urbanclean_users') || '[]').filter((user: { role: string }) => user.role === 'RECYCLING_CENTRE')).toHaveLength(1);
    const router = { navigate: vi.fn() } as any;
    const guard = new RecyclingCentreGuard(authService, router);
    expect(guard.canActivate()).toBe(true);

    const wrongRoles = [
      { id: 'USER01', role: 'NORMAL_USER', destination: '/user/dashboard' },
      { id: 'COLLECTOR01', role: 'COLLECTOR', destination: '/collector/dashboard' },
      { id: 'ADMIN01', role: 'ADMIN', destination: '/admin/dashboard' }
    ];
    for (const user of wrongRoles) {
      (authService as any).currentUserSubject.next({ id: user.id, role: user.role });
      (authService as any).currentSessionSubject.next({ id: user.id, role: user.role });
      expect(guard.canActivate()).toBe(false);
      expect(router.navigate).toHaveBeenLastCalledWith([user.destination]);
    }

    const layoutRoute = routes.find(route => route.path === '' && route.children);
    const centreRoute = layoutRoute?.children?.find(route => route.path === 'centre');
    expect(centreRoute?.canActivate).toContain(RecyclingCentreGuard);
    expect(centreRoute?.children?.map(route => route.path)).toEqual([
      'dashboard', 'requests', 'recycling', 'profile', 'notifications', ''
    ]);

    authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
    expect(storage.has('urbanclean_session')).toBe(false);
    expect(centres).toHaveLength(1);
    expect(guard.canActivate()).toBe(false);
    expect(router.navigate).toHaveBeenLastCalledWith(['/login']);
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

    role = 'NORMAL_USER';
    currentUser = { id: 'USER01', role };
    expect(requestService.getUserRequests('USER01').find(request => request.id === 'REQ01')?.collectionVerificationCode).toBeTruthy();

    role = 'COLLECTOR';
    currentUser = { id: 'COLLECTOR01', role };
    expect(requestService.updateCollectionStatus('REQ01', 'on-the-way')).toBe(true);
    const collectionCode = requestService.getRequestById('REQ01')?.collectionVerificationCode || '';
    expect(collectionCode).toMatch(/^UC-\d{4,}$/);
    expect(requestService.getCollectorRequests('COLLECTOR01')[0].collectionVerificationCode).toBeUndefined();
    let collectorStream: WasteRequest[] = [];
    const collectorSubscription = requestService.requests$.subscribe(requests => collectorStream = requests);
    expect(collectorStream.every(request => !request.collectionVerificationCode)).toBe(true);
    collectorSubscription.unsubscribe();
    expect(requestService.updateCollectionStatus('REQ01', 'collected')).toBe(false);
    expect(requestService.verifyCollectionCode('REQ01', 'COLLECTOR01', 'UC-0000')).toBe(false);
    expect(requestService.verifyCollectionCode('REQ01', 'COLLECTOR02', collectionCode)).toBe(false);
    const verificationStartedAt = Date.now();
    expect(requestService.verifyCollectionCode('REQ01', 'COLLECTOR01', collectionCode)).toBe(true);
    expect(requestService.getRequestById('REQ01')).toMatchObject({
      status: 'collected',
      verifiedByCollector: 'COLLECTOR01'
    });
    const verifiedAt = new Date(requestService.getRequestById('REQ01')?.verifiedAt || 0).getTime();
    expect(verifiedAt).toBeGreaterThanOrEqual(verificationStartedAt);
    expect(requestService.verifyCollectionCode('REQ01', 'COLLECTOR01', collectionCode)).toBe(false);
    const completionStartedAt = Date.now();
    expect(requestService.updateCollectionStatus('REQ01', 'completed')).toBe(true);
    expect(new Date(requestService.getRequestById('REQ01')?.completedAt || 0).getTime()).toBeGreaterThanOrEqual(completionStartedAt);
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

  it('seeds the demo Collector assignment, persists a proposed time, and keeps it out of history', async () => {
    storage.delete('urbanclean_requests');
    storage.delete('urbanclean_users');
    const authService = new AuthService();
    const userService = new UserService();
    const login = await new Promise<{ success: boolean }>(resolve => {
      authService.login('collector@urbanclean.com', 'Collector123!').subscribe(resolve);
    });
    expect(login.success).toBe(true);
    expect(authService.getCurrentUser()?.id).toBe('COLLECTOR01');

    const service = new RequestService(new LocationService(), authService, userService, new NotificationService());
    const requestsPage = new CollectorRequestsComponent(authService, service);
    expect(requestsPage.requests[0]).toMatchObject({
      id: 'REQ01',
      userId: 'USER01',
      location: { address: 'Stone Town' },
      preferredDate: '2026-10-10',
      preferredTime: '10:00',
      status: 'assigned'
    });
    expect(requestsPage.wasteTypeLabel(requestsPage.requests[0].wasteTypes)).toBe('Household Waste');
    expect(requestsPage.formatDate('2026-10-10')).toBe('10/10/2026');
    expect(requestsPage.formatTime('11:00')).toBe('11:00 AM');
    expect(requestsPage.schedulingRequestIds.has('REQ01')).toBe(false);

    requestsPage.openSchedule(requestsPage.requests[0]);
    expect(requestsPage.schedulingRequestIds.has('REQ01')).toBe(true);
    requestsPage.scheduleDrafts.REQ01 = { date: '2026-10-10', time: '11:00' };
    requestsPage.proposeTime(requestsPage.requests[0]);
    expect(service.getRequestById('REQ01')).toMatchObject({
      status: 'time-proposed',
      proposedCollectionDate: '2026-10-10',
      proposedCollectionTime: '11:00'
    });
    expect(requestsPage.nextStatus('time-proposed')).toBeNull();
    expect(service.updateCollectionStatus('REQ01', 'completed')).toBe(false);

    const reloadedService = new RequestService(new LocationService(), authService, userService, new NotificationService());
    expect(reloadedService.getRequestById('REQ01')?.proposedCollectionTime).toBe('11:00');
    const historyPage = new CollectorHistoryComponent(authService, reloadedService);
    expect(historyPage.completedRequests).toEqual([]);
    expect(JSON.parse(storage.get('urbanclean_requests') || '[]')[0].status).toBe('time-proposed');

    requestsPage.ngOnDestroy();
    historyPage.ngOnDestroy();
  });
});