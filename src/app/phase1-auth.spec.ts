import { describe, beforeEach, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { AuthGuard, AdminGuard, UserGuard } from './core/guards/auth.guard';
import { User } from './core/models/user.model';

describe('UrbanClean Phase 1 — Authentication, Registration & Session Flow', () => {
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

  it('Step 1 & 2: Should register a new Normal User, assign NORMAL_USER, and save in urbanclean_users', async () => {
    const regResult = await firstValueFrom(
      authService.register({
        fullName: 'Jane Resident',
        email: 'jane.resident@example.com',
        phone: '+255 700 111 222',
        location: 'Kiembe Samaki, Zanzibar',
        password: 'Password123!'
      })
    );

    expect(regResult.success).toBe(true);
    expect(regResult.user?.role).toBe('NORMAL_USER');
    expect(regResult.user?.fullName).toBe('Jane Resident');

    // Confirm user is saved in urbanclean_users
    const rawUsers = localStorage.getItem('urbanclean_users');
    expect(rawUsers).not.toBeNull();
    const parsedUsers: User[] = JSON.parse(rawUsers!);
    const savedUser = parsedUsers.find(u => u.email === 'jane.resident@example.com');
    expect(savedUser).toBeDefined();
    expect(savedUser?.role).toBe('NORMAL_USER');
    expect(savedUser?.phone).toBe('+255 700 111 222');
    expect(savedUser?.location.address).toBe('Kiembe Samaki, Zanzibar');
  });

  it('Step 1b: Should reject duplicate email registration with exact message "Email already registered."', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Jane Resident',
        email: 'jane.resident@example.com',
        phone: '+255 700 111 222',
        location: 'Kiembe Samaki, Zanzibar',
        password: 'Password123!'
      })
    );

    // Attempt duplicate registration with case-insensitivity
    const dupResult = await firstValueFrom(
      authService.register({
        fullName: 'Another Jane',
        email: 'JANE.RESIDENT@EXAMPLE.COM',
        phone: '+255 700 333 444',
        location: 'Stone Town',
        password: 'Password456!'
      })
    );

    expect(dupResult.success).toBe(false);
    expect(dupResult.message).toBe('Email already registered.');
  });

  it('Step 3 & 4: Should login using registered Normal User, store in urbanclean_session, and report NORMAL_USER', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Alice Walker',
        email: 'alice@example.com',
        phone: '+255 711 222 333',
        location: 'Mwanakwerekwe, Zanzibar',
        password: 'UserSecret123!'
      })
    );

    const loginResult = await firstValueFrom(
      authService.login('alice@example.com', 'UserSecret123!')
    );

    expect(loginResult.success).toBe(true);
    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.getCurrentUserRole()).toBe('NORMAL_USER');

    // Confirm stored in urbanclean_session
    const rawSession = localStorage.getItem('urbanclean_session');
    expect(rawSession).not.toBeNull();
    const sessionUser: User = JSON.parse(rawSession!);
    expect(sessionUser.email).toBe('alice@example.com');
    expect(sessionUser.fullName).toBe('Alice Walker');
    expect(sessionUser.role).toBe('NORMAL_USER');
  });

  it('Step 3b: Should reject invalid credentials during login', async () => {
    const wrongUser = await firstValueFrom(
      authService.login('nonexistent@example.com', 'wrongpassword')
    );
    expect(wrongUser.success).toBe(false);
    expect(wrongUser.message).toBe('Invalid credentials.');

    // Wrong password for existing user
    await firstValueFrom(
      authService.register({
        fullName: 'Test Resident',
        email: 'test@example.com',
        phone: '+255 700 000 000',
        location: 'Zanzibar',
        password: 'CorrectPassword1!'
      })
    );

    const wrongPass = await firstValueFrom(
      authService.login('test@example.com', 'WrongPassword!')
    );
    expect(wrongPass.success).toBe(false);
    expect(wrongPass.message).toBe('Invalid credentials.');
  });

  it('Step 5: Confirm Current User name is dynamically available and matches logged-in user', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Amina Kassim',
        email: 'amina@example.com',
        phone: '+255 777 888 999',
        location: 'Forodhani, Zanzibar',
        password: 'AminaPassword1!'
      })
    );

    await firstValueFrom(authService.login('amina@example.com', 'AminaPassword1!'));

    const currentUser = authService.getCurrentUser();
    expect(currentUser).not.toBeNull();
    expect(currentUser?.fullName).toBe('Amina Kassim');
    expect(currentUser?.fullName).not.toBe('John Doe');
  });

  it('Step 6: Confirm logout clears urbanclean_session and resets authentication status', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Bakari Juma',
        email: 'bakari@example.com',
        phone: '+255 755 444 333',
        location: 'Stone Town',
        password: 'BakariPassword1!'
      })
    );

    await firstValueFrom(authService.login('bakari@example.com', 'BakariPassword1!'));
    expect(authService.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('urbanclean_session')).not.toBeNull();

    authService.logout();

    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('urbanclean_session')).toBeNull();
  });

  it('Step 7 & 8: Should login using demo Admin (admin@urbanclean.com / Admin123!) and assign ADMIN role', async () => {
    // Demo admin was auto-seeded on AuthService creation
    const adminLogin = await firstValueFrom(
      authService.login('admin@urbanclean.com', 'Admin123!')
    );

    expect(adminLogin.success).toBe(true);
    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.getCurrentUserRole()).toBe('ADMIN');

    const session: User = JSON.parse(localStorage.getItem('urbanclean_session')!);
    expect(session.email).toBe('admin@urbanclean.com');
    expect(session.role).toBe('ADMIN');
  });

  it('Step 9: Confirm Normal User is denied access to /admin/* and redirected to /user/dashboard', async () => {
    await firstValueFrom(
      authService.register({
        fullName: 'Normal User Person',
        email: 'normal@example.com',
        phone: '+255 712 345 678',
        location: 'Zanzibar',
        password: 'Password123!'
      })
    );

    await firstValueFrom(authService.login('normal@example.com', 'Password123!'));

    const adminGuard = new AdminGuard(authService, mockRouter);
    const canAccessAdmin = adminGuard.canActivate({} as any, {} as any);

    expect(canAccessAdmin).toBe(false);
    expect(navigatedUrl).toBe('/user/dashboard');
  });

  it('Step 9b: Confirm Admin is denied access to /user/* and redirected to /admin/dashboard', async () => {
    await firstValueFrom(authService.login('admin@urbanclean.com', 'Admin123!'));

    const userGuard = new UserGuard(authService, mockRouter);
    const canAccessUser = userGuard.canActivate({} as any, {} as any);

    expect(canAccessUser).toBe(false);
    expect(navigatedUrl).toBe('/admin/dashboard');
  });

  it('Step 10: Confirm logged-out users are denied access by AuthGuard and redirected to /login', () => {
    authService.logout();

    const authGuard = new AuthGuard(authService, mockRouter);
    const canAccess = authGuard.canActivate({} as any, {} as any);

    expect(canAccess).toBe(false);
    expect(navigatedUrl).toBe('/login');
  });
});
