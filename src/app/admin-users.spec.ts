import '@angular/compiler';
import { describe, beforeEach, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';
import { RequestService } from './core/services/request.service';
import { LocationService } from './core/services/location.service';
import { NotificationService } from './core/services/notification.service';
import { AdminGuard } from './core/guards/auth.guard';
import { UsersComponent } from './features/admin/users/users.component';
import { DashboardComponent as AdminDashboardComponent } from './features/admin/dashboard/dashboard.component';
import { User } from './core/models/user.model';

describe('UrbanClean — Admin Users Feature (Sequential User IDs: USER01, USER02, ...)', () => {
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
    requestService = new RequestService(new LocationService(), authService, userService, new NotificationService());
  });

  it('Steps: Register first user (USER01), second user (USER02), third user (USER03)', async () => {
    // 1. Register first user → USER01
    const user1Res = await firstValueFrom(
      authService.register({
        fullName: 'Asha Ali',
        email: 'asha@gmail.com',
        phone: '+255 777 111 222',
        location: 'Stone Town, Zanzibar',
        password: 'Password123!'
      })
    );
    expect(user1Res.success).toBe(true);
    expect(user1Res.user!.id).toBe('USER01');

    // 2. Register second user → USER02
    const user2Res = await firstValueFrom(
      authService.register({
        fullName: 'John Ali',
        email: 'john@gmail.com',
        phone: '+255 777 333 444',
        location: 'Mlandege, Zanzibar',
        password: 'Password123!'
      })
    );
    expect(user2Res.success).toBe(true);
    expect(user2Res.user!.id).toBe('USER02');

    // 3. Register third user → USER03
    const user3Res = await firstValueFrom(
      authService.register({
        fullName: 'Fatma Ali',
        email: 'fatma@gmail.com',
        phone: '+255 777 555 666',
        location: 'Kiembe Samaki, Zanzibar',
        password: 'Password123!'
      })
    );
    expect(user3Res.success).toBe(true);
    expect(user3Res.user!.id).toBe('USER03');

    // 4 & 5. Login as Admin and open /admin/users
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    const usersComp = new UsersComponent(userService, authService);
    usersComp.ngOnInit();

    // 6. Confirm all User IDs are displayed correctly
    const u1 = usersComp.users.find(u => u.email === 'asha@gmail.com');
    const u2 = usersComp.users.find(u => u.email === 'john@gmail.com');
    const u3 = usersComp.users.find(u => u.email === 'fatma@gmail.com');

    expect(u1?.id).toBe('USER01');
    expect(u2?.id).toBe('USER02');
    expect(u3?.id).toBe('USER03');
  });

  it('User ID persistence: Remains unchanged after login, logout, profile edit, and admin edit', async () => {
    // Register user → USER01
    const regRes = await firstValueFrom(
      authService.register({
        fullName: 'Zuberi Khamis',
        email: 'zuberi@example.com',
        phone: '+255 777 999 888',
        location: 'Chwaka',
        password: 'Password123!'
      })
    );
    expect(regRes.user!.id).toBe('USER01');

    // 1. Login
    await firstValueFrom(authService.login('zuberi@example.com', 'Password123!'));
    expect(authService.getCurrentUser()?.id).toBe('USER01');

    // 2. Profile Update by User
    await firstValueFrom(
      authService.updateCurrentUser({
        fullName: 'Zuberi Khamis Updated',
        phone: '+255 777 000 111'
      })
    );
    expect(authService.getCurrentUser()?.id).toBe('USER01');

    // 3. Logout & Login again
    authService.logout();
    expect(authService.getCurrentUser()).toBeNull();

    await firstValueFrom(authService.login('zuberi@example.com', 'Password123!'));
    expect(authService.getCurrentUser()?.id).toBe('USER01');

    // 4. Admin Edit
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));
    const usersComp = new UsersComponent(userService, authService);
    usersComp.ngOnInit();

    const targetUser = usersComp.users.find(u => u.email === 'zuberi@example.com')!;
    expect(targetUser.id).toBe('USER01');

    usersComp.openEdit(targetUser);
    usersComp.editingUser!.fullName = 'Zuberi Khamis AdminEdited';
    usersComp.saveUserEdit();

    const storedUsers: User[] = JSON.parse(localStorage.getItem('urbanclean_users')!);
    const editedUser = storedUsers.find(u => u.email === 'zuberi@example.com')!;
    expect(editedUser.id).toBe('USER01');
    expect(editedUser.fullName).toBe('Zuberi Khamis AdminEdited');
  });

  it('Separation of User IDs (USER01) and Collection Request IDs (REQ01, REQ02, REQ03)', async () => {
    // Register user
    await firstValueFrom(
      authService.register({
        fullName: 'Asha Ali',
        email: 'asha@gmail.com',
        phone: '+255 777 111 222',
        location: 'Stone Town',
        password: 'Password123!'
      })
    );

    // Login as user
    await firstValueFrom(authService.login('asha@gmail.com', 'Password123!'));

    // Create Request 1
    const req1 = await firstValueFrom(
      requestService.createRequest(
        ['plastic'],
        -6.16,
        39.20,
        'Stone Town Port',
        new Date(),
        'Plastic bottles'
      )
    );

    // Create Request 2
    const req2 = await firstValueFrom(
      requestService.createRequest(
        ['organic'],
        -6.16,
        39.20,
        'Stone Town Market',
        new Date(),
        'Organic waste'
      )
    );

    expect(req1.requestId).toBe('REQ01');
    expect(req2.requestId).toBe('REQ02');

    // Verify User ID is USER01 and NOT REQ01
    const currentUser = authService.getCurrentUser();
    expect(currentUser?.id).toBe('USER01');
    expect(currentUser?.id).not.toBe('REQ01');
  });

  it('Search and filter users by User ID (USER01), name, email, status, and role', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Rashid Bakari',
        email: 'rashid@example.com',
        phone: '+255 778 123 456',
        location: 'Forodhani, Zanzibar',
        password: 'Password123!'
      })
    );

    await firstValueFrom(
      authService.register({
        fullName: 'Zainab Omar',
        email: 'zainab@example.com',
        phone: '+255 779 654 321',
        location: 'Mlandege, Zanzibar',
        password: 'Password123!'
      })
    );

    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const usersComp = new UsersComponent(userService, authService);
    usersComp.ngOnInit();

    // Search by User ID
    usersComp.searchTerm = 'USER01';
    usersComp.applyFilters();
    expect(usersComp.filteredUsers.length).toBe(1);
    expect(usersComp.filteredUsers[0].id).toBe('USER01');
    expect(usersComp.filteredUsers[0].fullName).toBe('Rashid Bakari');

    // Search by name
    usersComp.searchTerm = 'Zainab';
    usersComp.applyFilters();
    expect(usersComp.filteredUsers.length).toBe(1);
    expect(usersComp.filteredUsers[0].id).toBe('USER02');

    // Filter by status and role
    usersComp.searchTerm = '';
    usersComp.roleFilter = 'NORMAL_USER';
    usersComp.statusFilter = 'active';
    usersComp.applyFilters();
    expect(usersComp.filteredUsers.length).toBe(2);

    usersComp.roleFilter = 'ADMIN';
    usersComp.applyFilters();
    expect(usersComp.filteredUsers.length).toBe(1);
    expect(usersComp.filteredUsers[0].email).toBe('admin@urbanclean.com');
  });

  it('Should activate/deactivate user and toggle status correctly in urbanclean_users', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Mariam Said',
        email: 'mariam@example.com',
        phone: '+255 771 222 333',
        location: 'Zanzibar',
        password: 'Password123!'
      })
    );

    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const usersComp = new UsersComponent(userService, authService);
    usersComp.ngOnInit();

    const targetUser = usersComp.users.find(u => u.email === 'mariam@example.com')!;
    expect(targetUser.id).toBe('USER01');
    expect(targetUser.isActive).toBe(true);

    // Deactivate user
    usersComp.toggleUserStatus(targetUser);
    expect(usersComp.users.find(u => u.email === 'mariam@example.com')?.isActive).toBe(false);

    let rawUsers: User[] = JSON.parse(localStorage.getItem('urbanclean_users')!);
    expect(rawUsers.find(u => u.email === 'mariam@example.com')?.isActive).toBe(false);

    // Activate user again
    const deactivatedUser = usersComp.users.find(u => u.email === 'mariam@example.com')!;
    usersComp.toggleUserStatus(deactivatedUser);
    expect(usersComp.users.find(u => u.email === 'mariam@example.com')?.isActive).toBe(true);

    rawUsers = JSON.parse(localStorage.getItem('urbanclean_users')!);
    expect(rawUsers.find(u => u.email === 'mariam@example.com')?.isActive).toBe(true);
  });

  it('Should delete a user, remove from urbanclean_users, and reflect in Admin Dashboard stats', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Temporary User',
        email: 'temp@example.com',
        phone: '+255 772 333 444',
        location: 'Zanzibar',
        password: 'Password123!'
      })
    );

    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const adminDashboard = new AdminDashboardComponent(authService, userService, requestService);
    adminDashboard.ngOnInit();
    expect(adminDashboard.totalUsers).toBe(1);

    const usersComp = new UsersComponent(userService, authService);
    usersComp.ngOnInit();
    const tempUser = usersComp.users.find(u => u.email === 'temp@example.com')!;
    expect(tempUser.id).toBe('USER01');

    const originalConfirm = window.confirm;
    window.confirm = () => true;

    usersComp.deleteUser(tempUser);

    window.confirm = originalConfirm;

    const rawUsers: User[] = JSON.parse(localStorage.getItem('urbanclean_users')!);
    expect(rawUsers.some(u => u.email === 'temp@example.com')).toBe(false);

    adminDashboard.loadData();
    expect(adminDashboard.totalUsers).toBe(0);
  });

  it('Should deny Normal User access to /admin/users and redirect to /user/dashboard', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Normal User Attempt',
        email: 'normal.attempt@example.com',
        phone: '+255 773 444 555',
        location: 'Zanzibar',
        password: 'Password123!'
      })
    );

    await firstValueFrom(authService.login('normal.attempt@example.com', 'Password123!'));

    const adminGuard = new AdminGuard(authService, mockRouter);
    const canAccess = adminGuard.canActivate({ url: '/admin/users' } as any, {} as any);

    expect(canAccess).toBe(false);
    expect(navigatedUrl).toBe('/user/dashboard');
  });

  it('Should prevent Admin from deleting or deactivating their own logged-in Admin account', async () => {
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const usersComp = new UsersComponent(userService, authService);
    usersComp.ngOnInit();

    const adminUser = usersComp.users.find(u => u.email === 'admin@urbanclean.com')!;
    expect(usersComp.isCurrentAdmin(adminUser)).toBe(true);

    usersComp.toggleUserStatus(adminUser);
    expect(adminUser.isActive).toBe(true);

    usersComp.deleteUser(adminUser);
    const rawUsers: User[] = JSON.parse(localStorage.getItem('urbanclean_users')!);
    expect(rawUsers.some(u => u.email === 'admin@urbanclean.com')).toBe(true);
  });
});
