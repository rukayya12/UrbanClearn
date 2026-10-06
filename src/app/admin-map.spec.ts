import '@angular/compiler';
import { describe, beforeEach, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { RequestService } from './core/services/request.service';
import { NotificationService } from './core/services/notification.service';
import { LocationService } from './core/services/location.service';
import { UserService } from './core/services/user.service';
import { AdminGuard } from './core/guards/auth.guard';
import { MapComponent as AdminMapComponent } from './features/admin/map/map.component';

describe('UrbanClean — Admin Map Feature (Interactive Collection & User Locations)', () => {
  let authService: AuthService;
  let locationService: LocationService;
  let userService: UserService;
  let notificationService: NotificationService;
  let requestService: RequestService;
  let adminGuard: AdminGuard;
  let mockRouter: any;
  let navigatedUrl = '';

  beforeEach(() => {
    localStorage.clear();
    navigatedUrl = '';
    mockRouter = {
      navigate: (commands: any[]) => {
        navigatedUrl = commands.join('/');
        return Promise.resolve(true);
      },
      url: '/admin/map'
    };

    authService = new AuthService();
    locationService = new LocationService();
    userService = new UserService();
    notificationService = new NotificationService();
    requestService = new RequestService(locationService, authService, userService, notificationService);
    adminGuard = new AdminGuard(authService, mockRouter);
  });

  it('Step-by-step verification of Admin Map: User creation, Request creation, Map data synchronization, Search, Filters, Live Status Update, and Role Guard', async () => {
    // ----------------------------------------------------
    // STEP 1 & 2: Register & Login as Normal User, Create collection request with valid location
    // ----------------------------------------------------
    const regResult = await firstValueFrom(
      authService.register({
        fullName: 'Asha Ali',
        email: 'asha@example.com',
        phone: '+255 777 111 222',
        location: 'Stone Town Seaside, Zanzibar',
        password: 'Password123!'
      })
    );
    expect(regResult.success).toBe(true);
    expect(regResult.user?.id).toBe('USER01');

    await firstValueFrom(authService.login('asha@example.com', 'Password123!'));

    // Step 2 & 3: Create collection request with valid coordinates
    const reqResult = await firstValueFrom(
      requestService.createRequest(
        ['plastic'],
        -6.1639,
        35.7461,
        'Stone Town Seaside, Zanzibar',
        new Date(),
        'Plastic bottles near seaside'
      )
    );
    expect(reqResult.success).toBe(true);
    expect(reqResult.requestId).toBe('REQ01');

    // Confirm stored in urbanclean_requests
    const rawReqs = JSON.parse(localStorage.getItem('urbanclean_requests') || '[]');
    expect(rawReqs.length).toBe(1);
    expect(rawReqs[0].id).toBe('REQ01');
    expect(rawReqs[0].location.latitude).toBe(-6.1639);
    expect(rawReqs[0].location.longitude).toBe(35.7461);

    // ----------------------------------------------------
    // STEP 4 & 5: Login as Admin and Open /admin/map
    // ----------------------------------------------------
    authService.logout();
    const loginAdmin = await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    expect(loginAdmin.success).toBe(true);
    expect(authService.getCurrentUserRole()).toBe('ADMIN');

    const mapComp = new AdminMapComponent(requestService, userService, authService, 'browser');
    mapComp.ngOnInit();

    // ----------------------------------------------------
    // STEP 6: Confirm the request location appears in map data
    // ----------------------------------------------------
    expect(mapComp.requests.length).toBe(1);
    expect(mapComp.filteredRequests.length).toBe(1);
    const mapReq = mapComp.filteredRequests[0];
    expect(mapReq.id).toBe('REQ01');
    expect(mapReq.userId).toBe('USER01');
    expect(mapReq.userName).toBe('Asha Ali');
    expect(mapReq.wasteTypes).toContain('plastic');
    expect(mapReq.status).toBe('pending');
    expect(mapReq.location.latitude).toBe(-6.1639);
    expect(mapReq.location.longitude).toBe(35.7461);

    // Confirm user location appears as well
    expect(mapComp.users.length).toBe(1);
    expect(mapComp.filteredUsers.length).toBe(1);
    expect(mapComp.filteredUsers[0].id).toBe('USER01');
    expect(mapComp.filteredUsers[0].fullName).toBe('Asha Ali');

    // ----------------------------------------------------
    // STEP 7 & 8: Confirm marker popup details contain REQ ID, User ID, user name, waste type, status, date
    // ----------------------------------------------------
    mapComp.selectedItem = { type: 'request', data: mapReq };
    expect(mapComp.selectedItem.data.id).toBe('REQ01');
    expect(mapComp.selectedItem.data.userId).toBe('USER01');
    expect(mapComp.selectedItem.data.userName).toBe('Asha Ali');
    expect(mapComp.selectedItem.data.wasteTypes).toContain('plastic');
    expect(mapComp.selectedItem.data.status).toBe('pending');

    // ----------------------------------------------------
    // STEP 9: Search for REQ01
    // ----------------------------------------------------
    mapComp.searchTerm = 'REQ01';
    mapComp.onSearchChange();
    expect(mapComp.filteredRequests.length).toBe(1);
    expect(mapComp.filteredUsers.length).toBe(0); // Users don't have REQ01
    expect(mapComp.noLocationsFound).toBe(false);

    // Search by User ID
    mapComp.searchTerm = 'USER01';
    mapComp.onSearchChange();
    expect(mapComp.filteredRequests.length).toBe(1);
    expect(mapComp.filteredUsers.length).toBe(1);

    // Search by User Name
    mapComp.searchTerm = 'Asha Ali';
    mapComp.onSearchChange();
    expect(mapComp.filteredRequests.length).toBe(1);
    expect(mapComp.filteredUsers.length).toBe(1);

    // Search by Waste Type
    mapComp.searchTerm = 'plastic';
    mapComp.onSearchChange();
    expect(mapComp.filteredRequests.length).toBe(1);
    expect(mapComp.filteredUsers.length).toBe(0);

    // Search by Non-matching query
    mapComp.searchTerm = 'NON_EXISTENT_LOCATION_999';
    mapComp.onSearchChange();
    expect(mapComp.filteredRequests.length).toBe(0);
    expect(mapComp.filteredUsers.length).toBe(0);
    expect(mapComp.noLocationsFound).toBe(true);

    // Clear search
    mapComp.clearSearch();
    expect(mapComp.filteredRequests.length).toBe(1);
    expect(mapComp.filteredUsers.length).toBe(1);
    expect(mapComp.noLocationsFound).toBe(false);

    // ----------------------------------------------------
    // STEP 10: Test Status Filters
    // ----------------------------------------------------
    mapComp.setStatusFilter('PENDING');
    expect(mapComp.filteredRequests.length).toBe(1);

    mapComp.setStatusFilter('ACCEPTED');
    expect(mapComp.filteredRequests.length).toBe(0);

    mapComp.setStatusFilter('COMPLETED');
    expect(mapComp.filteredRequests.length).toBe(0);

    mapComp.setStatusFilter('REJECTED');
    expect(mapComp.filteredRequests.length).toBe(0);

    mapComp.setStatusFilter('ALL');
    expect(mapComp.filteredRequests.length).toBe(1);

    // Test Entity Filter (Requests only vs Users only)
    mapComp.setEntityFilter('REQUESTS');
    expect(mapComp.filteredRequests.length).toBe(1);
    expect(mapComp.filteredUsers.length).toBe(0);

    mapComp.setEntityFilter('USERS');
    expect(mapComp.filteredRequests.length).toBe(0);
    expect(mapComp.filteredUsers.length).toBe(1);

    mapComp.setEntityFilter('ALL');
    expect(mapComp.filteredRequests.length).toBe(1);
    expect(mapComp.filteredUsers.length).toBe(1);

    // ----------------------------------------------------
    // STEP 11 & 12: Change request status in Admin Requests (REQ01 → Accepted)
    // ----------------------------------------------------
    const statusChanged = requestService.changeStatus('REQ01', 'accepted');
    expect(statusChanged).toBe(true);

    // ----------------------------------------------------
    // STEP 13: Return to Admin Map and confirm the updated status is displayed
    // ----------------------------------------------------
    mapComp.loadData();
    expect(mapComp.filteredRequests.length).toBe(1);
    expect(mapComp.filteredRequests[0].status).toBe('accepted');

    mapComp.setStatusFilter('ACCEPTED');
    expect(mapComp.filteredRequests.length).toBe(1);

    mapComp.setStatusFilter('PENDING');
    expect(mapComp.filteredRequests.length).toBe(0);

    // Reset status filter
    mapComp.setStatusFilter('ALL');
    expect(mapComp.filteredRequests.length).toBe(1);

    // ----------------------------------------------------
    // STEP 14: Test Zanzibar Place Search (Zanzibar City, Stone Town, Mjini Magharibi, Nungwi, Paje)
    // ----------------------------------------------------
    // Default Zanzibar coordinates check
    expect(mapComp.defaultCenter[0]).toBeCloseTo(-6.1659, 2);
    expect(mapComp.defaultCenter[1]).toBeCloseTo(39.2026, 2);
    expect(mapComp.defaultZoom).toBe(12);

    // Search Stone Town
    mapComp.selectPlace('Stone Town');
    expect(mapComp.searchedPlace).not.toBeNull();
    expect(mapComp.searchedPlace?.name).toBe('Stone Town');
    expect(mapComp.searchedPlace?.lat).toBeCloseTo(-6.1630, 2);
    expect(mapComp.searchedPlace?.lng).toBeCloseTo(39.1890, 2);
    expect(mapComp.noLocationsFound).toBe(false);
    expect(mapComp.noLocationFound).toBe(false);

    // Search Nungwi
    mapComp.selectPlace('Nungwi');
    expect(mapComp.searchedPlace?.name).toBe('Nungwi');
    expect(mapComp.searchedPlace?.lat).toBeCloseTo(-5.7266, 2);
    expect(mapComp.searchedPlace?.lng).toBeCloseTo(39.2977, 2);

    // Search Paje
    mapComp.selectPlace('Paje');
    expect(mapComp.searchedPlace?.name).toBe('Paje');
    expect(mapComp.searchedPlace?.lat).toBeCloseTo(-6.2657, 2);

    // Search Mjini Magharibi
    mapComp.selectPlace('Mjini Magharibi');
    expect(mapComp.searchedPlace?.name).toBe('Mjini Magharibi');

    // Search Zanzibar City
    mapComp.selectPlace('Zanzibar City');
    expect(mapComp.searchedPlace?.name).toBe('Zanzibar City');

    // Reset View resets map and clears search place
    mapComp.resetView();
    expect(mapComp.searchedPlace).toBeNull();
    expect(mapComp.searchTerm).toBe('');

    // ----------------------------------------------------
    // STEP 15, 16 & 17: Normal User access to /admin/map is denied
    // ----------------------------------------------------
    authService.logout();
    await firstValueFrom(authService.login('asha@example.com', 'Password123!'));
    expect(authService.getCurrentUserRole()).toBe('NORMAL_USER');

    const canActivate = adminGuard.canActivate({} as any, { url: '/admin/map' } as any);
    expect(canActivate).toBe(false);
    expect(navigatedUrl).toBe('/user/dashboard');
  });

  it('Admin Map handles missing location data gracefully without fake coordinates', () => {
    const mapComp = new AdminMapComponent(requestService, userService, authService, 'browser', locationService);
    
    // Valid coordinate checks
    expect(mapComp.isValidCoordinate(-6.1639, 39.2026)).toBe(true);
    expect(mapComp.isValidCoordinate(0, 0)).toBe(false);
    expect(mapComp.isValidCoordinate(null, null)).toBe(false);
    expect(mapComp.isValidCoordinate(undefined, undefined)).toBe(false);
    expect(mapComp.isValidCoordinate(999, 999)).toBe(false);

    // Item without location
    const invalidItem = { location: { latitude: 0, longitude: 0, address: '' } };
    expect(mapComp.hasValidLocation(invalidItem)).toBe(false);

    // Non-existent search yields "No location found"
    mapComp.searchTerm = 'UNKNOWN_PLACE_XYZ';
    mapComp.onSearchChange();
    expect(mapComp.searchedPlace).toBeNull();
    expect(mapComp.filteredRequests.length).toBe(0);
    expect(mapComp.filteredUsers.length).toBe(0);
    expect(mapComp.noLocationFound).toBe(true);
    expect(mapComp.noLocationsFound).toBe(true);
  });

  it('Unauthenticated user cannot access /admin/map and is redirected to /login', () => {
    authService.logout();
    const canActivate = adminGuard.canActivate({} as any, { url: '/admin/map' } as any);
    expect(canActivate).toBe(false);
    expect(navigatedUrl).toBe('/login');
  });
});
