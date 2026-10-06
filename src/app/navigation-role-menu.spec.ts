import '@angular/compiler';
import { describe, beforeEach, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { AdminGuard, UserGuard } from './core/guards/auth.guard';
import { SidebarComponent } from './shared/layouts/sidebar/sidebar.component';

describe('UrbanClean — Role-Based Navigation and Route Protection', () => {
  let authService: AuthService;
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
  });

  it('Step 1, 2 & 3: Normal User menu should contain Dashboard, Request Collection, My Requests, Report, Notifications, Profile', async () => {
    // 1. Register and login as Normal User
    await firstValueFrom(
      authService.register({
        fullName: 'Normal User Person',
        email: 'resident@urbanclean.com',
        phone: '+255 777 000 111',
        location: 'Zanzibar City',
        password: 'UserPass123!'
      })
    );

    await firstValueFrom(authService.login('resident@urbanclean.com', 'UserPass123!'));

    // 2. Instantiate SidebarComponent
    const sidebar = new SidebarComponent(authService, mockRouter);
    sidebar.ngOnInit();

    const menuLabels = sidebar.menuItems.map(item => item.label);
    const menuRoutes = sidebar.menuItems.map(item => item.route);

    // Confirm allowed items
    expect(menuLabels).toEqual([
      'Dashboard',
      'Request Collection',
      'My Requests',
      'Report',
      'Notifications',
      'Profile'
    ]);

    expect(menuRoutes).toEqual([
      '/user/dashboard',
      '/user/request',
      '/user/requests',
      '/user/reports',
      '/user/notifications',
      '/user/profile'
    ]);

    // 3. Confirm Normal User does NOT see Map, Rewards, Users, or Admin routes
    expect(menuLabels).not.toContain('Map');
    expect(menuLabels).not.toContain('Rewards');
    expect(menuLabels).not.toContain('Users');

    expect(menuRoutes).not.toContain('/admin/map');
    expect(menuRoutes).not.toContain('/admin/reports');
    expect(menuRoutes).not.toContain('/admin/users');
    expect(menuRoutes).not.toContain('/admin/requests');
  });

  it('Step 4 & 5: Admin menu should contain Dashboard, Requests, Report, Map, Notifications, Profile', async () => {
    // 4. Login as Admin
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    // 5. Instantiate SidebarComponent
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

    // Confirm Normal User-only items are NOT in Admin menu
    expect(menuLabels).not.toContain('Request Collection');
    expect(menuLabels).not.toContain('My Requests');
  });

  it('Step 6 & 7: Accessing any Admin route as Normal User must be denied and redirected to /user/dashboard', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Resident User',
        email: 'resident2@urbanclean.com',
        phone: '+255 777 000 222',
        location: 'Stone Town',
        password: 'UserPass123!'
      })
    );

    await firstValueFrom(authService.login('resident2@urbanclean.com', 'UserPass123!'));

    const adminGuard = new AdminGuard(authService, mockRouter);

    // Test attempts to access various admin routes
    const adminRoutes = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/requests',
      '/admin/map',
      '/admin/reports',
      '/admin/notifications',
      '/admin/profile'
    ];

    for (const route of adminRoutes) {
      navigatedUrl = '';
      const canActivate = adminGuard.canActivate({ url: route } as any, {} as any);
      expect(canActivate).toBe(false);
      expect(navigatedUrl).toBe('/user/dashboard');
    }
  });

  it('Accessing User routes as Admin must be denied and redirected to /admin/dashboard', async () => {
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const userGuard = new UserGuard(authService, mockRouter);

    const userRoutes = [
      '/user/dashboard',
      '/user/request',
      '/user/requests',
      '/user/reports',
      '/user/notifications',
      '/user/profile'
    ];

    for (const route of userRoutes) {
      navigatedUrl = '';
      const canActivate = userGuard.canActivate({ url: route } as any, {} as any);
      expect(canActivate).toBe(false);
      expect(navigatedUrl).toBe('/admin/dashboard');
    }
  });
});
