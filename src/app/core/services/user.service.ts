import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User, Collector, RecyclingCentre, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersSubject = new BehaviorSubject<User[]>(this.getUsersFromStorage());
  public users$ = this.usersSubject.asObservable();

  constructor() {
    this.initializeUsers();
  }

  private initializeUsers(): void {
    const users = this.getUsersFromStorage();
    
    if (users.length <= 5) {
      // Add more mock users for demonstration
      const additionalUsers: User[] = [
        {
          id: 'user-002',
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+255 345 678 902',
          password: 'User123!',
          role: 'normal-user',
          location: {
            latitude: -6.1630,
            longitude: 35.7470,
            address: 'Hurumzi St, Zanzibar',
            region: 'Zanzibar',
            district: 'Zanzibar City',
            city: 'Stone Town'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'user-003',
          fullName: 'Ahmed Hassan',
          email: 'ahmed@example.com',
          phone: '+255 345 678 903',
          password: 'User123!',
          role: 'normal-user',
          location: {
            latitude: -6.1720,
            longitude: 35.7520,
            address: 'Malindi, Zanzibar',
            region: 'Zanzibar',
            district: 'Zanzibar City',
            city: 'Stone Town'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'collector-002',
          fullName: 'Collector Two',
          email: 'collector2@urbanclean.com',
          phone: '+255 456 789 013',
          password: 'Collector123!',
          role: 'collector',
          location: {
            latitude: -6.1800,
            longitude: 35.7350,
            address: 'Bumbuli, Zanzibar',
            region: 'Zanzibar',
            district: 'Zanzibar East',
            city: 'Bumbuli'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'collector-003',
          fullName: 'Collector Three',
          email: 'collector3@urbanclean.com',
          phone: '+255 456 789 014',
          password: 'Collector123!',
          role: 'collector',
          location: {
            latitude: -6.1550,
            longitude: 35.7380,
            address: 'Wete, Pemba',
            region: 'Zanzibar',
            district: 'Pemba North',
            city: 'Wete'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        },
        {
          id: 'centre-002',
          fullName: 'Recycling Centre B',
          email: 'centre2@urbanclean.com',
          phone: '+255 567 890 124',
          password: 'Centre123!',
          role: 'recycling-centre',
          location: {
            latitude: -6.2200,
            longitude: 35.7600,
            address: 'Muungano, Zanzibar',
            region: 'Zanzibar',
            district: 'Zanzibar South',
            city: 'Muungano'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      ];

      const allUsers = [...users, ...additionalUsers];
      localStorage.setItem('urbanclean_users', JSON.stringify(allUsers));
      this.usersSubject.next(allUsers);
    }
  }

  getAllUsers(): User[] {
    return this.getUsersFromStorage();
  }

  getUserById(id: string): User | undefined {
    return this.getAllUsers().find(u => u.id === id);
  }

  getUsersByRole(role: UserRole): User[] {
    return this.getAllUsers().filter(u => u.role === role);
  }

  getCollectors(): Collector[] {
    const collectors = this.getUsersByRole('collector') as unknown as Collector[];
    return collectors.map(c => ({
      ...c,
      availability: c.availability || 'available',
      totalCollections: c.totalCollections || 0,
      completedCollections: c.completedCollections || 0,
      rating: c.rating || 0
    }));
  }

  getRecyclingCentres(): RecyclingCentre[] {
    const centres = this.getUsersByRole('recycling-centre') as unknown as RecyclingCentre[];
    return centres.map(c => ({
      ...c,
      capacity: c.capacity || 1000,
      processingCapacity: c.processingCapacity || 500
    }));
  }

  getActiveCollectors(): Collector[] {
    return this.getCollectors().filter(c => c.availability === 'available');
  }

  updateUser(user: User): boolean {
    const users = this.getUsersFromStorage();
    const index = users.findIndex(u => u.id === user.id);

    if (index === -1) {
      return false;
    }

    user.updatedAt = new Date();
    users[index] = user;
    localStorage.setItem('urbanclean_users', JSON.stringify(users));
    this.usersSubject.next(users);

    return true;
  }

  updateCollectorAvailability(collectorId: string, availability: 'available' | 'busy' | 'offline'): boolean {
    const user = this.getUserById(collectorId) as Collector;

    if (!user || user.role !== 'collector') {
      return false;
    }

    user.availability = availability;
    return this.updateUser(user);
  }

  activateUser(userId: string): boolean {
    const user = this.getUserById(userId);

    if (!user) {
      return false;
    }

    user.isActive = true;
    return this.updateUser(user);
  }

  deactivateUser(userId: string): boolean {
    const user = this.getUserById(userId);

    if (!user) {
      return false;
    }

    user.isActive = false;
    return this.updateUser(user);
  }

  deleteUser(userId: string): boolean {
    const users = this.getUsersFromStorage();
    const index = users.findIndex(u => u.id === userId);

    if (index === -1) {
      return false;
    }

    users.splice(index, 1);
    localStorage.setItem('urbanclean_users', JSON.stringify(users));
    this.usersSubject.next(users);

    return true;
  }

  getStats(): {
    totalUsers: number;
    collectors: number;
    recyclingCentres: number;
    activeCollectors: number;
  } {
    const users = this.getAllUsers();
    return {
      totalUsers: users.filter(u => u.role === 'normal-user').length,
      collectors: users.filter(u => u.role === 'collector').length,
      recyclingCentres: users.filter(u => u.role === 'recycling-centre').length,
      activeCollectors: this.getActiveCollectors().length
    };
  }

  private getUsersFromStorage(): User[] {
    const stored = localStorage.getItem('urbanclean_users');
    return stored ? JSON.parse(stored) : [];
  }
}
