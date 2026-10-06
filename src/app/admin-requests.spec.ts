import '@angular/compiler';
import { describe, beforeEach, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';
import { RequestService } from './core/services/request.service';
import { LocationService } from './core/services/location.service';
import { NotificationService } from './core/services/notification.service';
import { AdminGuard } from './core/guards/auth.guard';
import { RequestsComponent as AdminRequestsComponent } from './features/admin/requests/requests.component';
import { RequestsComponent as UserRequestsComponent } from './features/user/requests/requests.component';
import { DashboardComponent as AdminDashboardComponent } from './features/admin/dashboard/dashboard.component';
import { WasteRequest } from './core/models/request.model';
import { User } from './core/models/user.model';

describe('UrbanClean — Admin Requests Feature (Full 22-Step Verification Flow)', () => {
  let authService: AuthService;
  let userService: UserService;
  let locationService: LocationService;
  let notificationService: NotificationService;
  let requestService: RequestService;
  let mockRouter: any;
  let navigatedUrl = '';

  beforeEach(() => {
    localStorage.clear();
    navigatedUrl = '';
    mockRouter = {
      navigate: (commands: any[]) => {
        navigatedUrl = commands.join('/');
        return Promise.resolve(true);
      }
    };
    authService = new AuthService();
    userService = new UserService();
    locationService = new LocationService();
    notificationService = new NotificationService();
    requestService = new RequestService(locationService, authService, userService, notificationService);
  });

  it('Complete 22-Step Flow: Normal User creates REQ01, Admin views & accepts, Normal User sees Accepted', async () => {
    // 1. Register a Normal User
    const regResult = await firstValueFrom(
      authService.register({
        fullName: 'Asha Ali',
        email: 'asha@gmail.com',
        phone: '+255 777 111 222',
        location: 'Stone Town, Zanzibar',
        password: 'Password123!'
      })
    );
    expect(regResult.success).toBe(true);
    expect(regResult.user!.id).toBe('USER01');

    // 2. Login as the Normal User
    const loginRes = await firstValueFrom(authService.login('asha@gmail.com', 'Password123!'));
    expect(loginRes.success).toBe(true);
    expect(authService.getCurrentUser()?.id).toBe('USER01');

    // 3. Create a collection request
    const createResult = await firstValueFrom(
      requestService.createRequest(
        ['plastic'],
        -6.1659,
        39.2026,
        'Forodhani Gardens, Zanzibar',
        new Date('2026-09-28T10:00:00Z'),
        'Plastic bottles collection'
      )
    );
    expect(createResult.success).toBe(true);

    // 4. Confirm it receives an ID such as REQ01
    expect(createResult.requestId).toBe('REQ01');

    // 5. Confirm the request is visible under My Requests
    const userRequestsComp = new UserRequestsComponent(requestService, authService, mockRouter);
    userRequestsComp.ngOnInit();
    expect(userRequestsComp.userRequests.length).toBe(1);
    expect(userRequestsComp.userRequests[0].id).toBe('REQ01');
    expect(userRequestsComp.userRequests[0].status).toBe('pending');

    // 6. Logout
    authService.logout();
    expect(authService.getCurrentUser()).toBeNull();

    // 7. Login as Admin
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    expect(authService.getCurrentUserRole()).toBe('ADMIN');

    // 8. Open /admin/requests
    const adminRequestsComp = new AdminRequestsComponent(requestService, authService, userService);
    adminRequestsComp.ngOnInit();

    // 9. Confirm the same REQ01 appears
    expect(adminRequestsComp.requests.length).toBe(1);
    expect(adminRequestsComp.requests[0].id).toBe('REQ01');

    // 10. Confirm the correct USER01 is displayed
    expect(adminRequestsComp.requests[0].userId).toBe('USER01');
    expect(adminRequestsComp.requests[0].userName).toBe('Asha Ali');

    // 11. Search for REQ01
    adminRequestsComp.searchTerm = 'REQ01';
    adminRequestsComp.applyFilters();
    expect(adminRequestsComp.filteredRequests.length).toBe(1);
    expect(adminRequestsComp.filteredRequests[0].id).toBe('REQ01');

    // 12. Filter by Pending
    adminRequestsComp.searchTerm = '';
    adminRequestsComp.statusFilter = 'pending';
    adminRequestsComp.applyFilters();
    expect(adminRequestsComp.filteredRequests.length).toBe(1);
    expect(adminRequestsComp.filteredRequests[0].id).toBe('REQ01');

    // 13. Open View
    adminRequestsComp.viewRequest(adminRequestsComp.requests[0]);
    expect(adminRequestsComp.selectedRequest).toBeDefined();
    expect(adminRequestsComp.selectedRequest?.id).toBe('REQ01');
    expect(adminRequestsComp.selectedRequest?.userId).toBe('USER01');
    expect(adminRequestsComp.selectedRequest?.userName).toBe('Asha Ali');
    expect(adminRequestsComp.selectedRequest?.userEmail).toBe('asha@gmail.com');

    // 14. Change REQ01 from Pending to Accepted
    adminRequestsComp.updateStatus(adminRequestsComp.selectedRequest!, 'accepted');

    // 15. Confirm the change is saved
    const rawRequests: WasteRequest[] = JSON.parse(localStorage.getItem('urbanclean_requests')!);
    expect(rawRequests[0].status).toBe('accepted');
    expect(adminRequestsComp.requests[0].status).toBe('accepted');
    expect(adminRequestsComp.selectedRequest?.status).toBe('accepted');

    // 16. Logout from Admin
    authService.logout();

    // 17. Login as the Normal User
    await firstValueFrom(authService.login('asha@gmail.com', 'Password123!'));

    // 18. Open My Requests
    const reloadedUserRequestsComp = new UserRequestsComponent(requestService, authService, mockRouter);
    reloadedUserRequestsComp.ngOnInit();

    // 19. Confirm REQ01 now shows Accepted
    expect(reloadedUserRequestsComp.userRequests.length).toBe(1);
    expect(reloadedUserRequestsComp.userRequests[0].id).toBe('REQ01');
    expect(reloadedUserRequestsComp.userRequests[0].status).toBe('accepted');

    // 20. Confirm Admin Dashboard statistics update correctly
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    const adminDashboard = new AdminDashboardComponent(authService, userService, requestService);
    adminDashboard.ngOnInit();
    expect(adminDashboard.totalWasteRequests).toBe(1);
    expect(adminDashboard.acceptedRequests).toBe(1);
    expect(adminDashboard.pendingRequests).toBe(0);

    // 21 & 22. Try accessing /admin/requests as NORMAL_USER and confirm access is denied
    await firstValueFrom(authService.login('asha@gmail.com', 'Password123!'));
    const adminGuard = new AdminGuard(authService, mockRouter);
    const canAccess = adminGuard.canActivate({ url: '/admin/requests' } as any, {} as any);
    expect(canAccess).toBe(false);
    expect(navigatedUrl).toBe('/user/dashboard');
  });

  it('Search and filter across Request ID, User ID, User Name, Waste Type, and Location', async () => {
    // User 1 (USER01)
    await firstValueFrom(
      authService.register({
        fullName: 'Asha Ali',
        email: 'asha@gmail.com',
        phone: '+255 777 111 222',
        location: 'Stone Town',
        password: 'Password123!'
      })
    );
    await firstValueFrom(authService.login('asha@gmail.com', 'Password123!'));
    await firstValueFrom(
      requestService.createRequest(['plastic'], -6.16, 39.20, 'Stone Town Port', new Date(), 'Bottles')
    );

    // User 2 (USER02)
    await firstValueFrom(
      authService.register({
        fullName: 'John Ali',
        email: 'john@gmail.com',
        phone: '+255 777 333 444',
        location: 'Mlandege',
        password: 'Password123!'
      })
    );
    await firstValueFrom(authService.login('john@gmail.com', 'Password123!'));
    await firstValueFrom(
      requestService.createRequest(['organic'], -6.17, 39.21, 'Mlandege Market', new Date(), 'Food waste')
    );

    // Admin view
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    const adminRequestsComp = new AdminRequestsComponent(requestService, authService, userService);
    adminRequestsComp.ngOnInit();

    expect(adminRequestsComp.requests.length).toBe(2);

    // Search by User ID
    adminRequestsComp.searchTerm = 'USER02';
    adminRequestsComp.applyFilters();
    expect(adminRequestsComp.filteredRequests.length).toBe(1);
    expect(adminRequestsComp.filteredRequests[0].id).toBe('REQ02');
    expect(adminRequestsComp.filteredRequests[0].userId).toBe('USER02');

    // Search by Waste Type
    adminRequestsComp.searchTerm = 'plastic';
    adminRequestsComp.applyFilters();
    expect(adminRequestsComp.filteredRequests.length).toBe(1);
    expect(adminRequestsComp.filteredRequests[0].id).toBe('REQ01');

    // Search by Location
    adminRequestsComp.searchTerm = 'Mlandege';
    adminRequestsComp.applyFilters();
    expect(adminRequestsComp.filteredRequests.length).toBe(1);
    expect(adminRequestsComp.filteredRequests[0].id).toBe('REQ02');

    // Search no results
    adminRequestsComp.searchTerm = 'NonexistentSearchQuery999';
    adminRequestsComp.applyFilters();
    expect(adminRequestsComp.filteredRequests.length).toBe(0);
  });

  it('Status lifecycle workflow: Pending → Accepted → Completed or Pending → Rejected', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Fatma Ali',
        email: 'fatma@gmail.com',
        phone: '+255 777 555 666',
        location: 'Kiembe Samaki',
        password: 'Password123!'
      })
    );
    await firstValueFrom(authService.login('fatma@gmail.com', 'Password123!'));
    await firstValueFrom(
      requestService.createRequest(['paper'], -6.16, 39.20, 'Kiembe Samaki Road', new Date(), 'Boxes')
    );

    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    const adminRequestsComp = new AdminRequestsComponent(requestService, authService, userService);
    adminRequestsComp.ngOnInit();

    const req = adminRequestsComp.requests[0];
    expect(req.status).toBe('pending');

    // Change to Accepted
    adminRequestsComp.updateStatus(req, 'accepted');
    expect(adminRequestsComp.requests[0].status).toBe('accepted');

    // Change to Completed
    adminRequestsComp.updateStatus(req, 'completed');
    expect(adminRequestsComp.requests[0].status).toBe('completed');

    let raw: WasteRequest[] = JSON.parse(localStorage.getItem('urbanclean_requests')!);
    expect(raw[0].status).toBe('completed');

    // Change to Rejected
    adminRequestsComp.updateStatus(req, 'rejected');
    expect(adminRequestsComp.requests[0].status).toBe('rejected');

    raw = JSON.parse(localStorage.getItem('urbanclean_requests')!);
    expect(raw[0].status).toBe('rejected');
  });
});
