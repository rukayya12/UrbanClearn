import '@angular/compiler';
import { describe, beforeEach, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';
import { RequestService } from './core/services/request.service';
import { AdminGuard } from './core/guards/auth.guard';
import { SidebarComponent } from './shared/layouts/sidebar/sidebar.component';
import { DashboardComponent as AdminDashboardComponent } from './features/admin/dashboard/dashboard.component';

describe('UrbanClean — Admin Dashboard & Statistics', () => {
  let authService: AuthService;
  let userService: UserService;
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
    requestService = new RequestService({} as any, authService, userService, {} as any);
  });

  it('Step 1 & 2: Login as Admin and confirm session role is ADMIN', async () => {
    const adminLogin = await firstValueFrom(
      authService.login('admin@urbanclean.com', 'Admin123!')
    );

    expect(adminLogin.success).toBe(true);
    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.getCurrentUserRole()).toBe('ADMIN');

    // Check session data
    const session = authService.getCurrentUser();
    expect(session?.email).toBe('admin@urbanclean.com');
    expect(session?.role).toBe('ADMIN');
  });

  it('Step 3: Confirm Admin sees the correct sidebar menu items and no Normal User items', async () => {
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const sidebar = new SidebarComponent(authService, mockRouter);
    sidebar.ngOnInit();

    const menuLabels = sidebar.menuItems.map(item => item.label);
    const menuRoutes = sidebar.menuItems.map(item => item.route);

    expect(menuLabels).toEqual([
      'Dashboard',
      'Requests',
      'Report',
      'Map',
      'Notifications',
      'Profile'
    ]);

    expect(menuRoutes).toEqual([
      '/admin/dashboard',
      '/admin/requests',
      '/admin/reports',
      '/admin/map',
      '/admin/notifications',
      '/admin/profile'
    ]);

    expect(menuLabels).not.toContain('Request Collection');
    expect(menuLabels).not.toContain('My Requests');
  });

  it('Step 4 & 5: Confirm Total Users and Recent Users come dynamically from urbanclean_users', async () => {
    // Register 2 test Normal Users
    await firstValueFrom(
      authService.register({
        fullName: 'Zuberi Ali',
        email: 'zuberi@example.com',
        phone: '+255 777 111 222',
        location: 'Zanzibar City',
        password: 'Password123!'
      })
    );

    await firstValueFrom(
      authService.register({
        fullName: 'Fatma Said',
        email: 'fatma@example.com',
        phone: '+255 777 333 444',
        location: 'Stone Town',
        password: 'Password123!'
      })
    );

    // Login as admin
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const adminDashboard = new AdminDashboardComponent(authService, userService, requestService);
    adminDashboard.ngOnInit();

    // Verify stats
    expect(adminDashboard.totalUsers).toBe(2);
    expect(adminDashboard.activeUsers).toBe(2);
    expect(adminDashboard.inactiveUsers).toBe(0);

    // Verify recent users list
    expect(adminDashboard.recentUsers.length).toBe(2);
    expect(adminDashboard.recentUsers.map(u => u.fullName)).toContain('Zuberi Ali');
    expect(adminDashboard.recentUsers.map(u => u.fullName)).toContain('Fatma Said');

    // Verify Admin Profile area data
    expect(adminDashboard.currentAdmin?.email).toBe('admin@urbanclean.com');
    expect(adminDashboard.currentAdmin?.fullName).toBe('UrbanClean Admin');
    expect(adminDashboard.currentAdmin?.role).toBe('ADMIN');
  });

  it('Step 6: Confirm request statistics do not use fake data and start at 0 if no requests exist', async () => {
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const adminDashboard = new AdminDashboardComponent(authService, userService, requestService);
    adminDashboard.ngOnInit();

    expect(adminDashboard.totalWasteRequests).toBe(0);
    expect(adminDashboard.pendingRequests).toBe(0);
    expect(adminDashboard.completedRequests).toBe(0);
    expect(adminDashboard.recentRequests.length).toBe(0);
  });

  it('Step 7: Confirm Normal User cannot access /admin/dashboard and is redirected to /user/dashboard', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Normal User Resident',
        email: 'resident@example.com',
        phone: '+255 712 999 000',
        location: 'Zanzibar',
        password: 'Password123!'
      })
    );

    await firstValueFrom(authService.login('resident@example.com', 'Password123!'));

    const adminGuard = new AdminGuard(authService, mockRouter);
    const canAccess = adminGuard.canActivate({ url: '/admin/dashboard' } as any, {} as any);

    expect(canAccess).toBe(false);
    expect(navigatedUrl).toBe('/user/dashboard');
  });

  it('Step 8 & 9: Helper status labels and colors render properly without errors', () => {
    const adminDashboard = new AdminDashboardComponent(authService, userService, requestService);

    expect(adminDashboard.getStatusLabel('pending')).toBe('Pending');
    expect(adminDashboard.getStatusLabel('completed')).toBe('Completed');
    expect(adminDashboard.getStatusLabel('rejected')).toBe('Rejected');

    expect(adminDashboard.getStatusColor('completed')).toBe('#10b981');
    expect(adminDashboard.getStatusColor('pending')).toBe('#f59e0b');
  });
});
