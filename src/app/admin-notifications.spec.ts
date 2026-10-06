import '@angular/compiler';
import { describe, beforeEach, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { RequestService } from './core/services/request.service';
import { NotificationService } from './core/services/notification.service';
import { LocationService } from './core/services/location.service';
import { UserService } from './core/services/user.service';
import { AdminGuard } from './core/guards/auth.guard';
import { NotificationsComponent as AdminNotificationsComponent } from './features/admin/notifications/notifications.component';
import { SidebarComponent } from './shared/layouts/sidebar/sidebar.component';

describe('UrbanClean — Admin Notifications Feature (Exact System Events & Data Flow)', () => {
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
      url: '/admin/notifications'
    };

    authService = new AuthService();
    locationService = new LocationService();
    userService = new UserService();
    notificationService = new NotificationService();
    requestService = new RequestService(locationService, authService, userService, notificationService);
    adminGuard = new AdminGuard(authService, mockRouter);
  });

  it('Step-by-step verification of real event generation, counters, refresh persistence, and non-duplication', async () => {
    // 1. Clear old test notification data (starts with 0)
    let adminComp = new AdminNotificationsComponent(notificationService);
    adminComp.ngOnInit();
    expect(adminComp.totalCount).toBe(0);
    expect(adminComp.unreadCount).toBe(0);
    expect(adminComp.readCount).toBe(0);

    // 2. Register a new Normal User (Asha Ali)
    const regResult = await firstValueFrom(
      authService.register({
        fullName: 'Asha Ali',
        email: 'asha@example.com',
        phone: '+255 777 111 222',
        location: 'Stone Town, Zanzibar',
        password: 'Password123!'
      })
    );
    expect(regResult.success).toBe(true);
    expect(regResult.user?.id).toBe('USER01');

    // 3. Login as Admin & 4. Open /admin/notifications
    const loginAdmin = await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    expect(loginAdmin.success).toBe(true);

    adminComp = new AdminNotificationsComponent(notificationService);
    adminComp.ngOnInit();

    // 5. Confirm "New User Registered" appears with message "Asha Ali has registered on UrbanClean."
    expect(adminComp.totalCount).toBe(1);
    expect(adminComp.unreadCount).toBe(1);
    expect(adminComp.readCount).toBe(0);

    const userRegNotif = adminComp.notifications.find(n => n.title === 'New User Registered');
    expect(userRegNotif).toBeDefined();
    expect(userRegNotif?.message).toBe('Asha Ali has registered on UrbanClean.');
    expect(userRegNotif?.targetUserId).toBe('USER01');
    expect(userRegNotif?.userName).toBe('Asha Ali');
    expect(userRegNotif?.read).toBe(false);

    // 6. Login as the Normal User
    authService.logout();
    const loginUser = await firstValueFrom(authService.login('asha@example.com', 'Password123!'));
    expect(loginUser.success).toBe(true);

    // 7. Create a collection request (REQ01)
    const reqResult = await firstValueFrom(
      requestService.createRequest(
        ['plastic'],
        -6.1639,
        35.7461,
        'Stone Town, Zanzibar',
        new Date(),
        'Plastic bottles'
      )
    );
    expect(reqResult.success).toBe(true);
    expect(reqResult.requestId).toBe('REQ01');

    // 8. Login as Admin again & 9. Open /admin/notifications
    authService.logout();
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    adminComp = new AdminNotificationsComponent(notificationService);
    adminComp.ngOnInit();

    // 10. Confirm "New Collection Request" appears with message "Asha Ali submitted collection request REQ01."
    expect(adminComp.totalCount).toBe(2);
    expect(adminComp.unreadCount).toBe(2);
    expect(adminComp.readCount).toBe(0);

    const collectionNotif = adminComp.notifications.find(n => n.title === 'New Collection Request');
    expect(collectionNotif).toBeDefined();
    expect(collectionNotif?.message).toBe('Asha Ali submitted collection request REQ01.');
    expect(collectionNotif?.requestId).toBe('REQ01');
    expect(collectionNotif?.targetUserId).toBe('USER01');
    expect(collectionNotif?.userName).toBe('Asha Ali');
    expect(collectionNotif?.read).toBe(false);

    // 11. Change the request status as Admin (Pending → Accepted)
    requestService.changeStatus('REQ01', 'accepted');
    adminComp.loadNotifications();

    // 12. Confirm a status update notification appears with message "Request REQ01 has been accepted."
    expect(adminComp.totalCount).toBe(3);
    expect(adminComp.unreadCount).toBe(3);
    expect(adminComp.readCount).toBe(0);

    const statusNotif = adminComp.notifications.find(n => n.title === 'Request Status Updated');
    expect(statusNotif).toBeDefined();
    expect(statusNotif?.message).toBe('Request REQ01 has been accepted.');
    expect(statusNotif?.requestId).toBe('REQ01');

    // 13. Confirm unread/read counters update correctly when an item is clicked/opened
    adminComp.onNotificationClick(statusNotif!);
    expect(adminComp.totalCount).toBe(3);
    expect(adminComp.unreadCount).toBe(2);
    expect(adminComp.readCount).toBe(1);

    // 14. Refresh the browser (simulate reload)
    const reloadedComp = new AdminNotificationsComponent(notificationService);
    reloadedComp.ngOnInit();

    // 15. Confirm notifications remain saved
    expect(reloadedComp.totalCount).toBe(3);
    expect(reloadedComp.unreadCount).toBe(2);
    expect(reloadedComp.readCount).toBe(1);

    // 16. Confirm notifications are not duplicated by refreshing
    reloadedComp.loadNotifications();
    expect(reloadedComp.totalCount).toBe(3);

    // Test Mark all as read
    reloadedComp.markAllAsRead();
    expect(reloadedComp.unreadCount).toBe(0);
    expect(reloadedComp.readCount).toBe(3);

    // Test sidebar badge synchronization
    const sidebar = new SidebarComponent(authService, mockRouter, notificationService);
    sidebar.ngOnInit();
    expect(sidebar.unreadCount).toBe(0);
  });

  it('Role Guard: Normal User is denied access to /admin/notifications', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Normal Resident',
        email: 'resident@example.com',
        phone: '0711223344',
        password: 'Password123!'
      })
    );
    await firstValueFrom(authService.login('resident@example.com', 'Password123!'));
    expect(authService.getCurrentUserRole()).toBe('NORMAL_USER');

    const canActivate = adminGuard.canActivate({} as any, { url: '/admin/notifications' } as any);
    expect(canActivate).toBe(false);
    expect(navigatedUrl).toBe('/user/dashboard');
  });
});
