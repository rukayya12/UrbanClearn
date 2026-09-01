import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole, AuthSession } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  private currentSessionSubject = new BehaviorSubject<AuthSession | null>(this.getSessionFromStorage());
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    this.initializeMockUsers();
  }

  private initializeMockUsers(): void {
    const users = this.getAllUsers();
    if (users.length === 0) {
      // Create initial mock users
      const mockUsers: User[] = [
        {
          id: 'superadmin-001',
          fullName: 'Super Admin',
          email: 'superadmin@urbanclean.com',
          phone: '+255 123 456 789',
          password: 'Admin123!',
          role: 'super-admin',
          location: {
            latitude: -6.1639,
            longitude: 35.7461,
            address: 'Zanzibar, Tanzania',
            region: 'Zanzibar',
            district: 'Zanzibar City',
            city: 'Stone Town'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'admin-001',
          fullName: 'Admin User',
          email: 'admin@urbanclean.com',
          phone: '+255 234 567 890',
          password: 'Admin123!',
          role: 'admin',
          location: {
            latitude: -6.1639,
            longitude: 35.7461,
            address: 'Zanzibar, Tanzania',
            region: 'Zanzibar',
            district: 'Zanzibar City',
            city: 'Stone Town'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'user-001',
          fullName: 'John Doe',
          email: 'user@urbanclean.com',
          phone: '+255 345 678 901',
          password: 'User123!',
          role: 'normal-user',
          location: {
            latitude: -6.1650,
            longitude: 35.7460,
            address: 'Forodhani, Zanzibar',
            region: 'Zanzibar',
            district: 'Zanzibar City',
            city: 'Stone Town'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'collector-001',
          fullName: 'Collector One',
          email: 'collector@urbanclean.com',
          phone: '+255 456 789 012',
          password: 'Collector123!',
          role: 'collector',
          location: {
            latitude: -6.1700,
            longitude: 35.7400,
            address: 'Nungwi, Zanzibar',
            region: 'Zanzibar',
            district: 'Zanzibar North',
            city: 'Nungwi'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'centre-001',
          fullName: 'Recycling Centre A',
          email: 'centre@urbanclean.com',
          phone: '+255 567 890 123',
          password: 'Centre123!',
          role: 'recycling-centre',
          location: {
            latitude: -6.2000,
            longitude: 35.7500,
            address: 'Kizimkazi, Zanzibar',
            region: 'Zanzibar',
            district: 'Zanzibar South',
            city: 'Kizimkazi'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      ];
      
      localStorage.setItem('urbanclean_users', JSON.stringify(mockUsers));
    }
  }

  login(email: string, password: string): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      setTimeout(() => {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
          observer.next({ success: false, message: 'User not found' });
          observer.complete();
          return;
        }

        if (user.password !== password) {
          observer.next({ success: false, message: 'Invalid password' });
          observer.complete();
          return;
        }

        if (!user.isActive) {
          observer.next({ success: false, message: 'User account is disabled' });
          observer.complete();
          return;
        }

        // Create mock session
        const session: AuthSession = {
          userId: user.id,
          email: user.email,
          role: user.role,
          token: `mock-token-${user.id}-${Date.now()}`,
          loginTime: new Date(),
          lastActivityTime: new Date()
        };

        this.currentUserSubject.next(user);
        this.currentSessionSubject.next(session);

        localStorage.setItem('urbanclean_session', JSON.stringify(session));
        localStorage.setItem('urbanclean_current_user', JSON.stringify(user));

        observer.next({ success: true, message: 'Login successful' });
        observer.complete();
      }, 500);
    });
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.currentSessionSubject.next(null);
    localStorage.removeItem('urbanclean_session');
    localStorage.removeItem('urbanclean_current_user');
  }

  register(user: User): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      setTimeout(() => {
        const users = this.getAllUsers();
        
        if (users.some(u => u.email === user.email)) {
          observer.next({ success: false, message: 'Email already registered' });
          observer.complete();
          return;
        }

        // Prevent normal users from registering as admin roles
        if (['super-admin', 'admin'].includes(user.role)) {
          observer.next({ success: false, message: 'Cannot register with this role' });
          observer.complete();
          return;
        }

        user.id = `user-${Date.now()}`;
        user.createdAt = new Date();
        user.updatedAt = new Date();
        user.isActive = true;

        users.push(user);
        localStorage.setItem('urbanclean_users', JSON.stringify(users));

        observer.next({ success: true, message: 'Registration successful' });
        observer.complete();
      }, 500);
    });
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentRole(): UserRole | null {
    return this.currentUserSubject.value?.role || null;
  }

  getSession(): AuthSession | null {
    return this.currentSessionSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  hasRole(role: UserRole): boolean {
    return this.getCurrentRole() === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const currentRole = this.getCurrentRole();
    return currentRole ? roles.includes(currentRole) : false;
  }

  private getUserFromStorage(): User | null {
    const stored = localStorage.getItem('urbanclean_current_user');
    return stored ? JSON.parse(stored) : null;
  }

  private getSessionFromStorage(): AuthSession | null {
    const stored = localStorage.getItem('urbanclean_session');
    return stored ? JSON.parse(stored) : null;
  }

  private getAllUsers(): User[] {
    const stored = localStorage.getItem('urbanclean_users');
    return stored ? JSON.parse(stored) : [];
  }
}
