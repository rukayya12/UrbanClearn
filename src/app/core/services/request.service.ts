import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { WasteRequest, StatusChange, RequestStatus, WasteType, RecyclingStatus } from '../models/request.model';
import { LocationService } from './location.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import { Collector } from '../models/user.model';
import { isFutureTanzaniaDateTime, isValidTanzaniaPreference } from '../utils/tanzania-date-time';

export interface CollectorRecommendation {
  collector: Collector;
  distanceMeters: number | null;
  currentAssignments: number;
  isAvailable: boolean;
  conflictReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private requestsSubject = new BehaviorSubject<WasteRequest[]>(this.getRequestsFromStorage());
  public get requests$(): Observable<WasteRequest[]> {
    return this.requestsSubject.asObservable().pipe(map(requests => this.visibleVerificationCodes(requests)));
  }

  constructor(
    private locationService: LocationService,
    private authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService
  ) {
    this.initializeRequests();
  }

  private initializeRequests(): void {
    const stored = localStorage.getItem('urbanclean_requests');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Clean out fake user-001 mock requests or any temporary test prefixes
          let modified = false;
          const cleaned = parsed
            .filter((r: any) => r.userId !== 'user-001')
            .map((r: any) => {
              if (typeof r.id === 'string' && r.id.startsWith('legacy-')) {
                modified = true;
                return { ...r, id: r.id.replace('legacy-', '') };
              }
              return r;
            });

          const usedCodes = new Set<string>();
          for (const request of cleaned) {
            if (!request.collectionVerificationCode || usedCodes.has(request.collectionVerificationCode)) {
              request.collectionVerificationCode = this.generateCollectionVerificationCode(usedCodes);
              modified = true;
            }
            usedCodes.add(request.collectionVerificationCode);
            if (request.status === 'completed' && !request.recyclingStatus) {
              request.recyclingStatus = 'ready-for-recycling';
              modified = true;
            }
          }

          if (cleaned.length !== parsed.length || modified) {
            localStorage.setItem('urbanclean_requests', JSON.stringify(cleaned));
            this.requestsSubject.next(cleaned);
            return;
          }
        }
      } catch {}
    }
  }

  /**
   * Generates the next simple sequential Request ID: REQ01, REQ02, REQ03, ...
   * Ensures that old demo requests, timestamp IDs, or unrelated IDs do NOT affect the sequence.
   * If there are no existing valid sequential requests, the first is REQ01.
   * Formats are strictly REQ01, REQ02, REQ03, ... with NO prefixes.
   */
  generateNextRequestId(userId?: string): string {
    const allRequests = this.getRequestsFromStorage();
    const highestStoredId = allRequests.reduce((highest, request) => {
      const match = /^REQ(\d+)$/i.exec(request.id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    const storedNextId = Number(localStorage.getItem('urbanclean_request_seq')) || 1;
    let nextNumber = Math.max(highestStoredId + 1, storedNextId);
    let nextId = this.formatRequestId(nextNumber);
    while (allRequests.some(request => request.id === nextId)) {
      nextNumber++;
      nextId = this.formatRequestId(nextNumber);
    }
    localStorage.setItem('urbanclean_request_seq', String(nextNumber + 1));
    return nextId;
  }

  private formatRequestId(sequence: number): string {
    return `REQ${String(sequence).padStart(2, '0')}`;
  }

  private generateCollectionVerificationCode(usedCodes: Set<string>): string {
    const firstCandidate = Math.floor(Math.random() * 9000);
    for (let offset = 0; offset < 9000; offset++) {
      const number = 1000 + ((firstCandidate + offset) % 9000);
      const code = `UC-${number}`;
      if (!usedCodes.has(code)) return code;
    }
    let number = 10000;
    while (usedCodes.has(`UC-${number}`)) number++;
    return `UC-${number}`;
  }

  createRequest(
    wasteTypes: WasteType[],
    latitude: number,
    longitude: number,
    address: string,
    requestedTime: Date,
    description?: string,
    preferredDate?: string,
    preferredTime?: string
  ): Observable<{ success: boolean; message: string; requestId?: string }> {
    return new Observable(observer => {
      setTimeout(() => {
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser) {
          observer.next({ success: false, message: 'User not authenticated' });
          observer.complete();
          return;
        }

        if (!isValidTanzaniaPreference(preferredDate, preferredTime)) {
          observer.next({ success: false, message: 'Choose a preferred date and time that is still in the future.' });
          observer.complete();
          return;
        }

        const hasValidCoordinates = this.locationService.isValidCoordinate(latitude, longitude);

        const nextId = this.generateNextRequestId(currentUser.id);
        const now = new Date();

        const request: WasteRequest = {
          id: nextId,
          userId: currentUser.id,
          userName: currentUser.fullName,
          userEmail: currentUser.email,
          userPhone: currentUser.phone,
          wasteTypes,
          location: {
            latitude: hasValidCoordinates ? latitude : 0,
            longitude: hasValidCoordinates ? longitude : 0,
            address
          },
          description,
          requestedTime: requestedTime || new Date(),
          preferredDate: preferredDate || undefined,
          preferredTime: preferredTime || undefined,
          collectionVerificationCode: this.generateCollectionVerificationCode(
            new Set(this.getRequestsFromStorage().map(item => item.collectionVerificationCode).filter((code): code is string => !!code))
          ),
          status: 'pending',
          statusHistory: [
            { status: 'pending', timestamp: now, notes: 'Request created by user' }
          ],
          createdAt: now,
          updatedAt: now
        };

        // Filter out any stale item that had this ID so IDs remain unique
        const requests = this.getRequestsFromStorage();
        requests.push(request);
        localStorage.setItem('urbanclean_requests', JSON.stringify(requests));
        this.requestsSubject.next(requests);

        // Notify user via notification service
        try {
          this.notificationService.createNotification(
            currentUser.id,
            'request-submitted',
            'Request Submitted',
            `Waste collection request ${request.id} has been submitted successfully.`,
            '/user/requests',
            request.id,
            currentUser.id,
            currentUser.fullName,
            'NORMAL_USER'
          );

          // Notify Admin
          this.notificationService.createNotification(
            'ADMIN',
            'request-submitted',
            'New Collection Request',
            `${currentUser.fullName} submitted collection request ${request.id}.`,
            '/admin/requests',
            request.id,
            currentUser.id,
            currentUser.fullName,
            'ADMIN'
          );
        } catch {
          // Ignore notification error
        }

        observer.next({
          success: true,
          message: 'Waste collection request created successfully',
          requestId: request.id
        });
        observer.complete();
      }, 200);
    });
  }

  getRequestById(id: string): WasteRequest | undefined {
    return this.getRequestsFromStorage().find(r => r.id === id);
  }

  getUserRequests(userId: string): WasteRequest[] {
    return this.visibleVerificationCodes(this.getRequestsFromStorage().filter(r => r.userId === userId));
  }

  private visibleVerificationCodes(requests: WasteRequest[]): WasteRequest[] {
    const viewer = this.authService.getCurrentUser();
    if (viewer?.role === 'ADMIN' || viewer?.role === 'SUPER_ADMIN') return requests;
    return requests.map(request => {
      const userCanSee = viewer?.role === 'NORMAL_USER' && viewer.id === request.userId &&
        ['scheduled', 'on-the-way', 'collected', 'completed'].includes(request.status);
      if (userCanSee) return request;
      const { collectionVerificationCode: _hiddenCode, ...visibleRequest } = request;
      return visibleRequest as WasteRequest;
    });
  }

  getCollectorRequests(collectorId: string): WasteRequest[] {
    this.ensureCollectorTestRequest(collectorId);
    return this.getRequestsFromStorage().filter(
      r => (r.assignedCollectorId || r.collectorId) === collectorId && r.status !== 'rejected'
    ).map(({ collectionVerificationCode: _hiddenCode, ...request }) => request as WasteRequest);
  }

  getRecyclingRequests(centreId: string): WasteRequest[] {
    if (!centreId) return [];
    return this.getRequestsFromStorage()
      .filter(request => request.status === 'completed' && (!request.recyclingCentreId || request.recyclingCentreId === centreId))
      .map(({ collectionVerificationCode: _hiddenCode, ...request }) => ({
        ...request,
        recyclingStatus: request.recyclingStatus || 'ready-for-recycling'
      }));
  }

  updateRecyclingStatus(
    requestId: string,
    centreId: string,
    nextStatus: RecyclingStatus,
    rejectionReason?: string
  ): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.id !== centreId || !this.authService.hasRole('RECYCLING_CENTRE')) return false;

    const requests = this.getRequestsFromStorage();
    const request = requests.find(item => item.id === requestId);
    if (!request || request.status !== 'completed' || (request.recyclingCentreId && request.recyclingCentreId !== centreId)) return false;

    const currentStatus = request.recyclingStatus || 'ready-for-recycling';
    const allowedNext: Record<RecyclingStatus, RecyclingStatus[]> = {
      'ready-for-recycling': ['accepted', 'rejected'],
      accepted: ['processing'],
      processing: ['recycled'],
      recycled: [],
      rejected: []
    };
    if (!allowedNext[currentStatus].includes(nextStatus)) return false;
    if (nextStatus === 'rejected' && !rejectionReason?.trim()) return false;

    const now = new Date();
    request.recyclingStatus = nextStatus;
    request.recyclingCentreId = centreId;
    request.updatedAt = now;
    if (nextStatus === 'accepted') request.recyclingAcceptedAt = now;
    if (nextStatus === 'processing') request.recyclingProcessingStartedAt = now;
    if (nextStatus === 'recycled') request.recycledAt = now;
    if (nextStatus === 'rejected') {
      request.recyclingRejectedAt = now;
      request.recyclingRejectionReason = rejectionReason!.trim();
    }
    this.saveRequests(requests);
    const notificationMessages: Record<RecyclingStatus, { title: string; message: string } | undefined> = {
      'ready-for-recycling': undefined,
      accepted: {
        title: 'Recycling Request Accepted',
        message: `Recycling request ${request.id} has been accepted.`
      },
      processing: {
        title: 'Recycling Processing Started',
        message: `Recycling request ${request.id} is now being processed.`
      },
      recycled: {
        title: 'Recycling Request Recycled',
        message: `Recycling request ${request.id} has been marked as recycled.`
      },
      rejected: {
        title: 'Recycling Request Rejected',
        message: `Recycling request ${request.id} has been rejected.`
      }
    };
    const notification = notificationMessages[nextStatus];
    if (notification) {
      this.notificationService.createNotification(
        centreId,
        'system',
        notification.title,
        notification.message,
        '/centre/notifications',
        request.id,
        undefined,
        undefined,
        'RECYCLING_CENTRE'
      );
    }
    return true;
  }

  private ensureCollectorTestRequest(collectorId: string): void {
    if (collectorId !== 'COLLECTOR01') return;
    const requests = this.getRequestsFromStorage();
    if (requests.some(request => request.collectorId === collectorId || request.id === 'REQ01')) return;

    const now = new Date();
    const testRequest: WasteRequest = {
      id: 'REQ01',
      userId: 'USER01',
      userName: 'USER01',
      userPhone: '',
      wasteTypes: ['organic'],
      location: { latitude: -6.1639, longitude: 39.189, address: 'Stone Town' },
      description: 'Household waste pickup',
      requestedTime: new Date('2026-10-10T10:00:00'),
      preferredDate: '2026-10-10',
      preferredTime: '10:00',
      collectionVerificationCode: this.generateCollectionVerificationCode(
        new Set(requests.map(request => request.collectionVerificationCode).filter((code): code is string => !!code))
      ),
      collectorId,
      collectorName: 'UrbanClean Collector',
      assignedAt: now,
      status: 'assigned',
      statusHistory: [{ status: 'assigned', timestamp: now, notes: 'Demo assignment for Collector testing' }],
      createdAt: now,
      updatedAt: now
    };
    this.saveRequests([...requests, testRequest]);
  }

  getCollectorRecommendations(requestId: string): CollectorRecommendation[] {
    const request = this.getRequestById(requestId);
    if (!request) return [];

    const hasRequestCoordinates = this.locationService.isValidCoordinate(
      request.location?.latitude,
      request.location?.longitude
    );
    const assignments = this.getRequestsFromStorage();

    return this.userService.getCollectors()
      .filter(collector => collector.isActive)
      .map(collector => {
        const hasCollectorCoordinates = this.locationService.isValidCoordinate(
          collector.location?.latitude,
          collector.location?.longitude
        );
        const distanceMeters = hasRequestCoordinates && hasCollectorCoordinates
          ? this.locationService.calculateDistance(
              request.location.latitude,
              request.location.longitude,
              collector.location.latitude,
              collector.location.longitude
            )
          : null;
        const currentAssignments = assignments.filter(item =>
          (item.assignedCollectorId || item.collectorId) === collector.id &&
          item.id !== requestId &&
          !['completed', 'rejected'].includes(item.status)
        ).length;
        const conflicts = this.hasScheduleConflict(
          collector.id,
          request.preferredDate,
          request.preferredTime,
          requestId
        );
        const isAvailable = collector.availability === 'available' && conflicts.length === 0;

        return {
          collector,
          distanceMeters,
          currentAssignments,
          isAvailable,
          conflictReason: conflicts.length
            ? `Already assigned to ${conflicts[0].id} at that time.`
            : collector.availability !== 'available'
              ? `Collector is ${collector.availability}.`
              : undefined
        };
      })
      .sort((first, second) => {
        if (first.isAvailable !== second.isAvailable) return first.isAvailable ? -1 : 1;
        if (first.distanceMeters === null) return second.distanceMeters === null ? 0 : 1;
        if (second.distanceMeters === null) return -1;
        return first.distanceMeters - second.distanceMeters;
      });
  }

  assignCollector(requestId: string, collectorId: string): boolean {
    if (!this.authService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) return false;
    const requests = this.getRequestsFromStorage();
    const request = requests.find(item => item.id === requestId);
    const recommendation = this.getCollectorRecommendations(requestId)
      .find(item => item.collector.id === collectorId);
    if (!request || request.status !== 'pending' || !recommendation?.isAvailable) return false;

    request.collectorId = recommendation.collector.id;
    request.collectorName = recommendation.collector.fullName;
    request.assignedCollectorId = recommendation.collector.id;
    request.assignedCollectorName = recommendation.collector.fullName;
    request.assignedAt = new Date();
    request.status = 'assigned';
    this.recordStatus(request, 'assigned', 'Collector assigned by Admin');
    this.saveRequests(requests);

    this.notifyRequest(request, 'Collector Assigned', `Collector ${request.collectorName} has been assigned to ${request.id}.`, 'NORMAL_USER');
    this.notifyRequest(request, 'New Collection Assigned', `${request.id} has been assigned to you.`, 'COLLECTOR', collectorId);
    return true;
  }

  proposeCollectionTime(requestId: string, collectorId: string, date: string, time: string): boolean {
    if (!this.authService.hasRole('COLLECTOR')) return false;
    const collector = this.userService.getCollectors().find(item => item.id === collectorId);
    const requests = this.getRequestsFromStorage();
    const request = requests.find(item => item.id === requestId);
    if (
      !request || (request.assignedCollectorId || request.collectorId) !== collectorId ||
      !collector || collector.availability !== 'available' ||
      !['assigned', 'reschedule-required'].includes(request.status) ||
      !this.isValidSchedule(date, time) ||
      this.hasScheduleConflict(collectorId, date, time, requestId).length > 0
    ) return false;

    request.proposedCollectionDate = date;
    request.proposedCollectionTime = time;
    request.status = 'time-proposed';
    this.recordStatus(request, 'time-proposed', 'Collector proposed a collection time');
    this.saveRequests(requests);

    this.notifyRequest(request, 'Collection Time Proposed', `${request.collectorName} proposed ${date} at ${time} for ${request.id}.`, 'ADMIN');
    this.notifyRequest(request, 'Collection Time Proposed', `A collection time has been proposed for ${request.id}.`, 'NORMAL_USER');
    return true;
  }

  verifyCollectionCode(requestId: string, collectorId: string, submittedCode: string): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.id !== collectorId || !this.authService.hasRole('COLLECTOR')) return false;
    const requests = this.getRequestsFromStorage();
    const request = requests.find(item => item.id === requestId);
    if (
      !request || (request.assignedCollectorId || request.collectorId) !== collectorId ||
      !['scheduled', 'on-the-way'].includes(request.status) ||
      ['completed', 'cancelled', 'rejected'].includes(request.status) ||
      !request.collectionVerificationCode ||
      request.collectionVerificationCode !== (submittedCode || '').trim().toUpperCase()
    ) return false;

    request.verifiedAt = new Date();
    request.verifiedByCollector = collectorId;
    request.status = 'collected';
    this.recordStatus(request, 'collected', 'Collection verification code accepted by Collector');
    this.saveRequests(requests);
    this.notifyRequest(request, 'Collection Verified', `${request.id} was verified and marked as collected.`, 'NORMAL_USER');
    this.notifyRequest(request, 'Collection Verified', `${request.id} was verified and marked as collected.`, 'ADMIN');
    return true;
  }

  approveProposedTime(requestId: string): boolean {
    if (!this.authService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) return false;
    const requests = this.getRequestsFromStorage();
    const request = requests.find(item => item.id === requestId);
    if (
      !request || request.status !== 'time-proposed' || !request.proposedCollectionDate ||
      !request.proposedCollectionTime || !this.isValidSchedule(request.proposedCollectionDate, request.proposedCollectionTime)
    ) return false;

    request.confirmedCollectionDate = request.proposedCollectionDate;
    request.confirmedCollectionTime = request.proposedCollectionTime;
    request.status = 'scheduled';
    this.recordStatus(request, 'scheduled', 'Collection time approved by Admin');
    this.saveRequests(requests);

    this.notifyRequest(request, 'Collection Time Approved', `${request.id} is scheduled for ${request.confirmedCollectionDate} at ${request.confirmedCollectionTime}.`, 'NORMAL_USER');
    this.notifyRequest(request, 'Collection Time Approved', `Admin approved the schedule for ${request.id}.`, 'COLLECTOR', request.collectorId);
    return true;
  }

  requestDifferentTime(requestId: string): boolean {
    if (!this.authService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) return false;
    const requests = this.getRequestsFromStorage();
    const request = requests.find(item => item.id === requestId);
    if (!request || request.status !== 'time-proposed') return false;

    request.proposedCollectionDate = undefined;
    request.proposedCollectionTime = undefined;
    request.status = 'reschedule-required';
    this.recordStatus(request, 'reschedule-required', 'Admin requested a different collection time');
    this.saveRequests(requests);

    this.notifyRequest(request, 'Different Time Requested', `Admin requested a different time for ${request.id}.`, 'COLLECTOR', request.collectorId);
    this.notifyRequest(request, 'Reschedule Required', `The proposed time for ${request.id} needs to be changed.`, 'NORMAL_USER');
    return true;
  }

  updateCollectionStatus(requestId: string, newStatus: 'on-the-way' | 'collected' | 'completed'): boolean {
    const collectorId = this.authService.getCurrentUser()?.id;
    if (!collectorId || !this.authService.hasRole('COLLECTOR')) return false;
    const requests = this.getRequestsFromStorage();
    const request = requests.find(item => item.id === requestId);
    const allowedNext: Record<string, string> = {
      scheduled: 'on-the-way',
      collected: 'completed'
    };
    if (!request || (request.assignedCollectorId || request.collectorId) !== collectorId || allowedNext[request.status] !== newStatus) return false;

    request.status = newStatus;
    this.recordStatus(request, newStatus, `Collector updated status to ${newStatus}`);
    if (newStatus === 'completed') {
      request.completionTime = new Date();
      request.completedAt = request.completionTime;
      request.recyclingStatus ||= 'ready-for-recycling';
    }
    this.saveRequests(requests);
    this.notifyRequest(request, 'Collection Status Updated', `${request.id} is now ${newStatus.replace('-', ' ')}.`, 'NORMAL_USER');
    this.notifyRequest(request, 'Collection Status Updated', `${request.id} is now ${newStatus.replace('-', ' ')}.`, 'ADMIN');
    return true;
  }

  isCollectorAvailableForSchedule(collectorId: string, date: string, time: string, requestId: string): boolean {
    const collector = this.userService.getCollectors().find(item => item.id === collectorId);
    return collector?.availability === 'available' && this.hasScheduleConflict(collectorId, date, time, requestId).length === 0;
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
        if (!this.authService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) {
          observer.next({ success: false, message: 'Only Admin can update request status' });
          observer.complete();
          return;
        }
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
          request.completedAt = request.completionTime;
          request.recyclingStatus ||= 'ready-for-recycling';
        }

        localStorage.setItem('urbanclean_requests', JSON.stringify(requests));
        this.requestsSubject.next(requests);

        try {
          let notifType: 'request-accepted' | 'request-rejected' | 'collection-completed' | 'system' = 'system';
          if (newStatus === 'accepted') notifType = 'request-accepted';
          else if (newStatus === 'rejected') notifType = 'request-rejected';
          else if (newStatus === 'completed') notifType = 'collection-completed';

          const statusVerb = (newStatus || '').toLowerCase();

          // User notification
          this.notificationService.createNotification(
            request.userId,
            notifType,
            'Request Status Updated',
            `Request ${request.id} has been ${statusVerb}.`,
            '/user/requests',
            request.id,
            request.userId,
            request.userName,
            'NORMAL_USER'
          );

          // Admin notification
          this.notificationService.createNotification(
            'ADMIN',
            notifType,
            'Request Status Updated',
            `Request ${request.id} has been ${statusVerb}.`,
            '/admin/requests',
            request.id,
            request.userId,
            request.userName,
            'ADMIN'
          );
        } catch {}

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

  /**
   * Synchronously changes request status and persists to urbanclean_requests
   */
  changeStatus(requestId: string, newStatus: RequestStatus | string, notes?: string): boolean {
    if (!this.authService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) return false;
    const requests = this.getRequestsFromStorage();
    const request = requests.find(r => r.id === requestId);

    if (!request) {
      return false;
    }

    const normalizedStatus = (newStatus.toLowerCase() as RequestStatus);
    const statusChange: StatusChange = {
      status: normalizedStatus,
      timestamp: new Date(),
      notes: notes || `Status updated to ${normalizedStatus} by Admin`
    };

    request.status = normalizedStatus;
    if (!request.statusHistory) {
      request.statusHistory = [];
    }
    request.statusHistory.push(statusChange);
    request.updatedAt = new Date();

    if (normalizedStatus === 'completed') {
      request.completionTime = new Date();
      request.completedAt = request.completionTime;
      request.recyclingStatus ||= 'ready-for-recycling';
    }

    localStorage.setItem('urbanclean_requests', JSON.stringify(requests));
    this.requestsSubject.next(requests);

    try {
      let notifType: 'request-accepted' | 'request-rejected' | 'collection-completed' | 'system' = 'system';
      if (normalizedStatus === 'accepted') notifType = 'request-accepted';
      else if (normalizedStatus === 'rejected') notifType = 'request-rejected';
      else if (normalizedStatus === 'completed') notifType = 'collection-completed';

      const statusVerb = normalizedStatus;

      // User notification
      this.notificationService.createNotification(
        request.userId,
        notifType,
        'Request Status Updated',
        `Request ${request.id} has been ${statusVerb}.`,
        '/user/requests',
        request.id,
        request.userId,
        request.userName,
        'NORMAL_USER'
      );

      // Admin notification
      this.notificationService.createNotification(
        'ADMIN',
        notifType,
        'Request Status Updated',
        `Request ${request.id} has been ${statusVerb}.`,
        '/admin/requests',
        request.id,
        request.userId,
        request.userName,
        'ADMIN'
      );
    } catch {}

    return true;
  }

  getAllRequests(): WasteRequest[] {
    return this.getRequestsFromStorage();
  }

  getRequestsStats(): {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
    rejected: number;
  } {
    const requests = this.getRequestsFromStorage();
    return {
      total: requests.length,
      pending: requests.filter(r => ['pending', 'received'].includes(r.status?.toLowerCase())).length,
      accepted: requests.filter(r => ['assigned', 'time-proposed', 'reschedule-required', 'scheduled', 'on-the-way', 'collected', 'accepted', 'scheduling', 'processed'].includes(r.status?.toLowerCase())).length,
      completed: requests.filter(r => r.status?.toLowerCase() === 'completed').length,
      rejected: requests.filter(r => r.status?.toLowerCase() === 'rejected').length
    };
  }

  private hasScheduleConflict(
    collectorId: string,
    date?: string,
    time?: string,
    excludeRequestId?: string
  ): WasteRequest[] {
    if (!date || !time) return [];
    const proposedMinutes = this.timeToMinutes(time);
    if (proposedMinutes === null) return [];

    return this.getRequestsFromStorage().filter(request => {
      if (
        (request.assignedCollectorId || request.collectorId) !== collectorId ||
        request.id === excludeRequestId ||
        !['assigned', 'time-proposed', 'scheduled', 'on-the-way', 'collected'].includes(request.status)
      ) return false;

      const assignedDate = request.confirmedCollectionDate || request.proposedCollectionDate || request.preferredDate;
      const assignedTime = request.confirmedCollectionTime || request.proposedCollectionTime || request.preferredTime;
      const assignedMinutes = this.timeToMinutes(assignedTime);
      return assignedDate === date && assignedMinutes !== null && Math.abs(assignedMinutes - proposedMinutes) < 60;
    });
  }

  private isValidSchedule(date: string, time: string): boolean {
    return isFutureTanzaniaDateTime(date, time);
  }

  private timeToMinutes(time?: string): number | null {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [hours, minutes] = time.split(':').map(Number);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  private recordStatus(request: WasteRequest, status: RequestStatus, notes: string): void {
    if (!request.statusHistory) request.statusHistory = [];
    request.statusHistory.push({ status, timestamp: new Date(), notes });
    request.updatedAt = new Date();
  }

  private saveRequests(requests: WasteRequest[]): void {
    localStorage.setItem('urbanclean_requests', JSON.stringify(requests));
    this.requestsSubject.next([...requests]);
  }

  private notifyRequest(
    request: WasteRequest,
    title: string,
    message: string,
    role: 'ADMIN' | 'NORMAL_USER' | 'COLLECTOR',
    collectorId?: string
  ): void {
    const recipientId = role === 'ADMIN' ? 'ADMIN' : role === 'COLLECTOR' ? collectorId : request.userId;
    if (!recipientId) return;
    const route = role === 'ADMIN' ? '/admin/requests' : role === 'COLLECTOR' ? '/collector/requests' : '/user/requests';
    this.notificationService.createNotification(
      recipientId,
      'system',
      title,
      message,
      route,
      request.id,
      recipientId,
      role === 'COLLECTOR' ? request.collectorName : request.userName,
      role
    );
  }

  private getRequestsFromStorage(): WasteRequest[] {
    const stored = localStorage.getItem('urbanclean_requests');
    if (!stored) return [];

    let requests: WasteRequest[];
    try {
      requests = JSON.parse(stored);
    } catch {
      return [];
    }

    if (!Array.isArray(requests)) {
      return [];
    }

    // Auto-enrich userEmail from urbanclean_users if missing
    let usersList: any[] = [];
    try {
      const rawUsers = localStorage.getItem('urbanclean_users');
      if (rawUsers) {
        usersList = JSON.parse(rawUsers);
      }
    } catch {}

    return requests.map(req => {
      if (!req.userEmail && req.userId) {
        const found = usersList.find(u => u.id === req.userId);
        if (found) {
          return { ...req, userEmail: found.email, userName: req.userName || found.fullName, userPhone: req.userPhone || found.phone };
        }
      }
      return req;
    });
  }

  /**
   * Helper to update notification request ID references if needed
   */
  private updateNotificationRequestId(oldId: string, newId: string): void {
    try {
      const raw = localStorage.getItem('urbanclean_notifications');
      if (raw) {
        const notifs = JSON.parse(raw);
        let changed = false;
        for (const n of notifs) {
          if (n.requestId === oldId) {
            n.requestId = newId;
            changed = true;
          }
          if (n.message && typeof n.message === 'string' && n.message.includes(oldId)) {
            n.message = n.message.split(oldId).join(newId);
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem('urbanclean_notifications', JSON.stringify(notifs));
        }
      }
    } catch {
      // Ignore notification parse error
    }
  }
}
