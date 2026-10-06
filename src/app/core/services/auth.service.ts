import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole, Location, generateNextCollectorId, generateNextUserId } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentSessionSubject = new BehaviorSubject<User | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    this.ensureDemoAdminAccount();
    this.refreshCurrentUser();
  }

  private ensureDemoAdminAccount(): void {
    const users = this.getAllUsers();
    const hasAdmin = users.some(user => user.role === 'ADMIN');
    const demoEmail = 'admin@urbanclean.com';
    const demoEmailExists = users.some(user => user.email.toLowerCase() === demoEmail);

    if (!hasAdmin && !demoEmailExists) {
      const now = new Date();
      users.push({
        id: 'ADMIN01',
        fullName: 'UrbanClean Admin',
        email: demoEmail,
        phone: '',
        password: 'Admin123!',
        role: 'ADMIN',
        location: {
          latitude: -6.1639,
          longitude: 35.7461,
          address: 'Zanzibar, Tanzania',
          region: 'Zanzibar',
          district: 'Zanzibar City',
          city: 'Stone Town'
        },
        createdAt: now,
        updatedAt: now,
        isActive: true
      });
      this.saveUsers(users);
    }
  }

  login(email: string, password: string): Observable<{ success: boolean; message: string; isNotRegistered?: boolean }> {
    return new Observable(observer => {
      setTimeout(() => {
        const users = this.getAllUsers();
        const trimmedEmail = (email || '').trim().toLowerCase();
        const user = users.find(u => u.email.trim().toLowerCase() === trimmedEmail);

        if (!user) {
          observer.next({ success: false, message: 'Invalid credentials.' });
          observer.complete();
          return;
        }

        if (user.password !== password) {
          observer.next({ success: false, message: 'Invalid credentials.' });
          observer.complete();
          return;
        }

        if (!user.isActive) {
          observer.next({ success: false, message: 'User account is disabled' });
          observer.complete();
          return;
        }

        user.lastLogin = new Date();
        user.isOnline = true;
        user.updatedAt = new Date();
        this.saveUsers(users);

        const sessionUser = { ...user };
        this.currentUserSubject.next(sessionUser);
        this.currentSessionSubject.next(sessionUser);
        localStorage.setItem('urbanclean_session', JSON.stringify(sessionUser));
        localStorage.setItem('urbanclean_current_user', JSON.stringify(sessionUser));

        observer.next({ success: true, message: 'Login successful' });
        observer.complete();
      }, 300);
    });
  }

  logout(): void {
    const current = this.currentUserSubject.value;
    if (current) {
      const users = this.getAllUsers();
      const user = users.find(item => item.id === current.id);
      if (user) {
        user.isOnline = false;
        user.updatedAt = new Date();
        this.saveUsers(users);
      }
    }
    this.currentUserSubject.next(null);
    this.currentSessionSubject.next(null);
    localStorage.removeItem('urbanclean_session');
    localStorage.removeItem('urbanclean_current_user');
  }

  register(userData: { fullName: string; email: string; phone: string; location?: string; password: string; username?: string }): Observable<{ success: boolean; message: string; user?: User }> {
    return new Observable(observer => {
      setTimeout(() => {
        const users = this.getAllUsers();
        const trimmedEmail = (userData.email || '').trim().toLowerCase();
        
        if (users.some(u => u.email.trim().toLowerCase() === trimmedEmail)) {
          observer.next({ success: false, message: 'Email already registered.' });
          observer.complete();
          return;
        }

        const now = new Date();
        const locationAddress = (userData.location || '').trim() || 'Zanzibar, Tanzania';
        const location: Location = {
          latitude: -6.1639,
          longitude: 35.7461,
          address: locationAddress,
          region: 'Zanzibar',
          district: 'Zanzibar City',
          city: 'Stone Town'
        };
        const newUser: User = {
          id: this.generateUserId(users),
          fullName: (userData.fullName || '').trim(),
          username: userData.username ? userData.username.trim() : undefined,
          email: trimmedEmail,
          phone: (userData.phone || '').trim(),
          password: userData.password,
          role: 'NORMAL_USER',
          location,
          createdAt: now,
          updatedAt: now,
          isActive: true,
          isOnline: false
        };

        users.push(newUser);
        this.saveUsers(users);

        // Create Admin notification for new user registration
        try {
          const storedNotifs = JSON.parse(localStorage.getItem('urbanclean_notifications') || '[]');
          const notif = {
            id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: 'ADMIN',
            recipientRole: 'ADMIN',
            targetRole: 'ADMIN',
            type: 'system',
            title: 'New User Registered',
            message: `${newUser.fullName} has registered on UrbanClean.`,
            targetUserId: newUser.id,
            userName: newUser.fullName,
            read: false,
            createdAt: now
          };
          storedNotifs.push(notif);
          localStorage.setItem('urbanclean_notifications', JSON.stringify(storedNotifs));
        } catch {
          // ignore storage errors
        }

        observer.next({ success: true, message: 'Registration successful.', user: newUser });
        observer.complete();
      }, 300);
    });
  }

  private generateUserId(users: User[] = []): string {
    return generateNextUserId(users);
  }

  updateCurrentUser(updatedData: Partial<User>): Observable<{ success: boolean; message: string; user?: User }> {
    return new Observable(observer => {
      const current = this.currentUserSubject.value;
      if (!current) {
        observer.next({ success: false, message: 'User not authenticated' });
        observer.complete();
        return;
      }

      const users = this.getAllUsers();
      const index = users.findIndex(u => u.id === current.id);
      if (index === -1) {
        observer.next({ success: false, message: 'User record not found' });
        observer.complete();
        return;
      }

      if (updatedData.email && updatedData.email.trim().toLowerCase() !== current.email.toLowerCase()) {
        const emailTaken = users.some(u => u.id !== current.id && u.email.toLowerCase() === updatedData.email!.trim().toLowerCase());
        if (emailTaken) {
          observer.next({ success: false, message: 'Email already in use by another account.' });
          observer.complete();
          return;
        }
      }

      if (updatedData.username && (!current.username || updatedData.username.trim().toLowerCase() !== current.username.toLowerCase())) {
        const usernameTaken = users.some(u => u.id !== current.id && u.username && u.username.toLowerCase() === updatedData.username!.trim().toLowerCase());
        if (usernameTaken) {
          observer.next({ success: false, message: 'Username already in use by another account.' });
          observer.complete();
          return;
        }
      }

      const merged: User = {
        ...users[index],
        ...updatedData,
        id: current.id,
        role: current.role,
        updatedAt: new Date()
      };

      users[index] = merged;
      this.saveUsers(users);

      this.currentUserSubject.next({ ...merged });
      localStorage.setItem('urbanclean_current_user', JSON.stringify(merged));

      const session = this.currentSessionSubject.value;
      if (session && session.id === merged.id) {
        this.currentSessionSubject.next({ ...merged });
        localStorage.setItem('urbanclean_session', JSON.stringify(merged));
      }

      observer.next({ success: true, message: 'Profile updated successfully', user: merged });
      observer.complete();
    });
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentRole(): UserRole | null {
    return this.currentUserSubject.value?.role || null;
  }

  getCurrentUserRole(): UserRole | null {
    return this.getCurrentRole();
  }

  getSession(): User | null {
    return this.currentSessionSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentSessionSubject.value && !!this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  hasRole(role: UserRole): boolean {
    return this.getCurrentRole() === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const currentRole = this.getCurrentRole();
    return currentRole ? roles.includes(currentRole) : false;
  }

  private getUserFromStorage(): User | null {
    return this.getSessionFromStorage();
  }

  private getSessionFromStorage(): User | null {
    const stored = localStorage.getItem('urbanclean_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.id === 'string') {
          return { ...parsed, role: this.normalizeRole(parsed.role) };
        }

        // Restore sessions written by the previous AuthSession format.
        if (parsed && typeof parsed.userId === 'string') {
          const legacyUser = this.getAllUsers().find(user => user.id === parsed.userId);
          if (legacyUser) return legacyUser;
          const oldCurrentUser = localStorage.getItem('urbanclean_current_user');
          if (oldCurrentUser) {
            const user = JSON.parse(oldCurrentUser);
            if (user?.id === parsed.userId) return { ...user, role: this.normalizeRole(user.role) };
          }
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  private getAllUsers(): User[] {
    const stored = localStorage.getItem('urbanclean_users');
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      let modified = false;
      const users = parsed.map((user: User) => {
        let userId = user.id;
        // If user does not have a suitable sequential ID (USER01, USER02, ... or ADMIN01)
        if (!userId || typeof userId !== 'string' || (!/^USER\d+$/i.test(userId) && !/^COLLECTOR\d+$/i.test(userId) && userId !== 'ADMIN01' && !userId.startsWith('admin-'))) {
          if (user.role === 'ADMIN' || (user.email && user.email.toLowerCase() === 'admin@urbanclean.com')) {
            userId = 'ADMIN01';
          } else if (user.role === 'COLLECTOR') {
            userId = generateNextCollectorId(parsed);
          } else {
            userId = generateNextUserId(parsed);
          }
          modified = true;
        }
        return {
          ...user,
          id: userId,
          role: this.normalizeRole(user.role)
        };
      });

      if (modified) {
        localStorage.setItem('urbanclean_users', JSON.stringify(users));
      }
      return users;
    } catch {
      return [];
    }
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem('urbanclean_users', JSON.stringify(users));
  }

  private refreshCurrentUser(): void {
    const user = this.getUserFromStorage();
    this.currentUserSubject.next(user);
    this.currentSessionSubject.next(user);
    if (user) {
      localStorage.setItem('urbanclean_session', JSON.stringify(user));
      localStorage.setItem('urbanclean_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('urbanclean_current_user');
    }
  }

  private normalizeRole(role: string): UserRole {
    const roles: Record<string, UserRole> = {
      'super-admin': 'SUPER_ADMIN', super_admin: 'SUPER_ADMIN', SUPER_ADMIN: 'SUPER_ADMIN',
      admin: 'ADMIN', ADMIN: 'ADMIN', 'normal-user': 'NORMAL_USER', normal_user: 'NORMAL_USER', NORMAL_USER: 'NORMAL_USER',
      collector: 'COLLECTOR', COLLECTOR: 'COLLECTOR', 'recycling-centre': 'RECYCLING_CENTRE', recycling_centre: 'RECYCLING_CENTRE', RECYCLING_CENTRE: 'RECYCLING_CENTRE'
    };
    return roles[role] || 'NORMAL_USER';
  }
}
