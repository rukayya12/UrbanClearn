import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User, Collector, RecyclingCentre, UserRole, generateNextCollectorId, generateNextUserId } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersSubject = new BehaviorSubject<User[]>(this.getUsersFromStorage());
  public users$ = this.usersSubject.asObservable();

  constructor() {}

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
    const collectors = this.getUsersByRole('COLLECTOR') as unknown as Collector[];
    return collectors.map(c => ({
      ...c,
      availability: c.availability || 'available',
      totalCollections: c.totalCollections || 0,
      completedCollections: c.completedCollections || 0,
      rating: c.rating || 0
    }));
  }

  getRecyclingCentres(): RecyclingCentre[] {
    const centres = this.getUsersByRole('RECYCLING_CENTRE') as unknown as RecyclingCentre[];
    return centres.map(c => ({
      ...c,
      capacity: c.capacity || 1000,
      processingCapacity: c.processingCapacity || 500
    }));
  }

  getActiveCollectors(): Collector[] {
    return this.getCollectors().filter(c => c.availability === 'available');
  }

  addCollector(data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    latitude: number;
    longitude: number;
    availability: Collector['availability'];
  }): Collector | null {
    const users = this.getUsersFromStorage();
    const email = data.email.trim().toLowerCase();
    if (!email || users.some(user => user.email.toLowerCase() === email)) return null;

    const now = new Date();
    const hasCoordinates = Number.isFinite(data.latitude) && Number.isFinite(data.longitude) &&
      (data.latitude !== 0 || data.longitude !== 0) &&
      data.latitude >= -90 && data.latitude <= 90 && data.longitude >= -180 && data.longitude <= 180;
    const collector: Collector = {
      id: generateNextCollectorId(users),
      fullName: data.fullName.trim(),
      email,
      phone: data.phone.trim(),
      password: data.password,
      role: 'COLLECTOR',
      location: {
        latitude: hasCoordinates ? data.latitude : 0,
        longitude: hasCoordinates ? data.longitude : 0,
        address: data.address.trim(),
        region: 'Zanzibar',
        district: '',
        city: ''
      },
      createdAt: now,
      updatedAt: now,
      isActive: true,
      availability: data.availability,
      totalCollections: 0,
      completedCollections: 0,
      rating: 0
    };

    users.push(collector);
    localStorage.setItem('urbanclean_users', JSON.stringify(users));
    this.usersSubject.next(users);
    return collector;
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

    if (!user || user.role !== 'COLLECTOR') {
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
      totalUsers: users.filter(u => u.role === 'NORMAL_USER').length,
      collectors: users.filter(u => u.role === 'COLLECTOR').length,
      recyclingCentres: users.filter(u => u.role === 'RECYCLING_CENTRE').length,
      activeCollectors: this.getActiveCollectors().length
    };
  }

  private getUsersFromStorage(): User[] {
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
        return { ...user, id: userId };
      });

      if (modified) {
        localStorage.setItem('urbanclean_users', JSON.stringify(users));
      }
      return users;
    } catch {
      return [];
    }
  }
}


