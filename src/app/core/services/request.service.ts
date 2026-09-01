import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WasteRequest, StatusChange, RequestStatus, WasteType } from '../models/request.model';
import { LocationService } from './location.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private requestsSubject = new BehaviorSubject<WasteRequest[]>(this.getRequestsFromStorage());
  public requests$ = this.requestsSubject.asObservable();

  constructor(
    private locationService: LocationService,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.initializeRequests();
  }

  private initializeRequests(): void {
    // Initialize with some mock data if empty
    const requests = this.getRequestsFromStorage();
    if (requests.length === 0) {
      const mockRequests: WasteRequest[] = [
        {
          id: 'req-001',
          userId: 'user-001',
          userName: 'John Doe',
          userPhone: '+255 345 678 901',
          wasteTypes: ['plastic', 'paper'],
          location: {
            latitude: -6.1650,
            longitude: 35.7460,
            address: 'Forodhani, Zanzibar'
          },
          description: 'Regular household waste collection',
          requestedTime: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
          status: 'completed',
          statusHistory: [
            { status: 'pending', timestamp: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000) },
            { status: 'received', timestamp: new Date(new Date().getTime() - 1.9 * 24 * 60 * 60 * 1000) },
            { status: 'completed', timestamp: new Date(new Date().getTime() - 1.8 * 24 * 60 * 60 * 1000) }
          ],
          collectorId: 'collector-001',
          collectorName: 'Collector One',
          completionTime: new Date(new Date().getTime() - 1.8 * 24 * 60 * 60 * 1000),
          greenPoints: 10,
          createdAt: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(new Date().getTime() - 1.8 * 24 * 60 * 60 * 1000)
        }
      ];
      localStorage.setItem('urbanclean_requests', JSON.stringify(mockRequests));
      this.requestsSubject.next(mockRequests);
    }
  }

  createRequest(
    wasteTypes: WasteType[],
    latitude: number,
    longitude: number,
    address: string,
    requestedTime: Date,
    description?: string
  ): Observable<{ success: boolean; message: string; requestId?: string }> {
    return new Observable(observer => {
      setTimeout(() => {
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser) {
          observer.next({ success: false, message: 'User not authenticated' });
          observer.complete();
          return;
        }

        if (!this.locationService.isValidCoordinate(latitude, longitude)) {
          observer.next({ success: false, message: 'Invalid coordinates' });
          observer.complete();
          return;
        }

        const request: WasteRequest = {
          id: `req-${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.fullName,
          userPhone: currentUser.phone,
          wasteTypes,
          location: {
            latitude,
            longitude,
            address
          },
          description,
          requestedTime,
          status: 'pending',
          statusHistory: [
            { status: 'pending', timestamp: new Date() }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Auto-assign collector
        const collectors = this.userService.getCollectors();
        const result = this.locationService.findNearestCollector(latitude, longitude, collectors);

        if (result.collector) {
          request.collectorId = result.collector.id;
          request.collectorName = result.collector.fullName;
          this.updateRequestStatus(request.id, 'received');
        } else {
          request.status = 'received';
          this.updateRequestStatus(request.id, 'received', 'No nearby collector available');
        }

        const requests = this.getRequestsFromStorage();
        requests.push(request);
        localStorage.setItem('urbanclean_requests', JSON.stringify(requests));
        this.requestsSubject.next(requests);

        observer.next({
          success: true,
          message: 'Waste collection request created successfully',
          requestId: request.id
        });
        observer.complete();
      }, 500);
    });
  }

  getRequestById(id: string): WasteRequest | undefined {
    return this.getRequestsFromStorage().find(r => r.id === id);
  }

  getUserRequests(userId: string): WasteRequest[] {
    return this.getRequestsFromStorage().filter(r => r.userId === userId);
  }

  getCollectorRequests(collectorId: string): WasteRequest[] {
    return this.getRequestsFromStorage().filter(
      r => r.collectorId === collectorId && ['accepted', 'scheduling', 'completed'].includes(r.status)
    );
  }

  getRequestsByStatus(status: RequestStatus): WasteRequest[] {
    return this.getRequestsFromStorage().filter(r => r.status === status);
  }

  updateRequestStatus(
    requestId: string,
    newStatus: RequestStatus,
    notes?: string
  ): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      setTimeout(() => {
        const requests = this.getRequestsFromStorage();
        const request = requests.find(r => r.id === requestId);

        if (!request) {
          observer.next({ success: false, message: 'Request not found' });
          observer.complete();
          return;
        }

        const statusChange: StatusChange = {
          status: newStatus,
          timestamp: new Date(),
          notes
        };

        request.status = newStatus;
        request.statusHistory.push(statusChange);
        request.updatedAt = new Date();

        if (newStatus === 'completed') {
          request.completionTime = new Date();
          request.greenPoints = this.calculateGreenPoints(request);
        }

        localStorage.setItem('urbanclean_requests', JSON.stringify(requests));
        this.requestsSubject.next(requests);

        observer.next({ success: true, message: 'Request status updated' });
        observer.complete();
      }, 300);
    });
  }

  acceptRequest(requestId: string): Observable<{ success: boolean; message: string }> {
    return this.updateRequestStatus(requestId, 'accepted', 'Collector accepted the request');
  }

  rejectRequest(requestId: string): Observable<{ success: boolean; message: string }> {
    return this.updateRequestStatus(requestId, 'rejected', 'Collector rejected the request');
  }

  completeRequest(requestId: string): Observable<{ success: boolean; message: string }> {
    return this.updateRequestStatus(requestId, 'completed', 'Collection completed successfully');
  }

  getAllRequests(): WasteRequest[] {
    return this.getRequestsFromStorage();
  }

  getRequestsStats(): {
    total: number;
    pending: number;
    completed: number;
    rejected: number;
  } {
    const requests = this.getRequestsFromStorage();
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending' || r.status === 'received' || r.status === 'scheduling').length,
      completed: requests.filter(r => r.status === 'completed').length,
      rejected: requests.filter(r => r.status === 'rejected').length
    };
  }

  private calculateGreenPoints(request: WasteRequest): number {
    // Base points per waste type
    const points = request.wasteTypes.length * 10;
    
    // Bonus for on-time completion (if completed within 24 hours)
    const timeDiff = new Date().getTime() - request.createdAt.getTime();
    const hoursElapsed = timeDiff / (1000 * 60 * 60);
    
    if (hoursElapsed <= 24) {
      return points + 5;
    }
    
    return points;
  }

  private getRequestsFromStorage(): WasteRequest[] {
    const stored = localStorage.getItem('urbanclean_requests');
    return stored ? JSON.parse(stored) : [];
  }
}
