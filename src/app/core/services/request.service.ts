import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WasteRequest, StatusChange, RequestStatus, WasteType } from '../models/request.model';
import { LocationService } from './location.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import { Collector } from '../models/user.model';

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
  public requests$ = this.requestsSubject.asObservable();

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

          const hasReq01 = cleaned.some((r: any) => r.id === 'REQ01');
          if (!hasReq01) {
            localStorage.removeItem('urbanclean_request_seq');
          }

          if (cleaned.length !== parsed.length || modified) {
            localStorage.setItem('urbanclean_requests', JSON.stringify(cleaned));
            this.requestsSubject.next(cleaned);
            return;
          }
        }
      } catch {}
    } else {
      localStorage.removeItem('urbanclean_request_seq');
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

    // Trace the contiguous chain of valid sequential requests starting at 1 (REQ01)
    let validSeqLength = 0;
    let lastCreatedAt = -1;
    let lastIndex = -1;

    while (true) {
      const targetNum = validSeqLength + 1;
      const targetPad = targetNum < 10 ? `0${targetNum}` : `${targetNum}`;
      const targetId = `REQ${targetPad}`;

      const candidates = allRequests.filter(r => 
        r.id === targetId && 
        r.userId !== 'user-001'
      );

      if (candidates.length === 0) {
        break;
      }

      if (validSeqLength === 0) {
        // First request REQ01 marks the start of the valid sequential chain
        const reqTime = candidates[0].createdAt ? new Date(candidates[0].createdAt).getTime() : 0;
        lastCreatedAt = isNaN(reqTime) ? 0 : reqTime;
        lastIndex = allRequests.indexOf(candidates[0]);
        validSeqLength = 1;
      } else {
        // Subsequent requests must be in chronological or storage order following the predecessor
        const validCandidate = candidates.find(r => {
          const reqTime = r.createdAt ? new Date(r.createdAt).getTime() : 0;
          const idx = allRequests.indexOf(r);
          return (isNaN(reqTime) ? false : reqTime >= lastCreatedAt) || idx > lastIndex;
        });

        if (validCandidate) {
          const reqTime = validCandidate.createdAt ? new Date(validCandidate.createdAt).getTime() : 0;
          lastCreatedAt = isNaN(reqTime) ? lastCreatedAt : reqTime;
          lastIndex = Math.max(lastIndex, allRequests.indexOf(validCandidate));
          validSeqLength++;
        } else {
          break;
        }
      }
    }

    const nextSeq = validSeqLength + 1;
    const padded = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
    const nextId = `REQ${padded}`;

    // Update storage counter
    localStorage.setItem('urbanclean_request_seq', nextSeq.toString());

    return nextId;
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
          status: 'pending',
          statusHistory: [
            { status: 'pending', timestamp: now, notes: 'Request created by user' }
          ],
          createdAt: now,
          updatedAt: now
        };

        // Filter out any stale item that had this ID so IDs remain unique
        const requests = this.getRequestsFromStorage().filter(r => r.id !== nextId);
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
    return this.getRequestsFromStorage().filter(r => r.userId === userId);
  }

  getCollectorRequests(collectorId: string): WasteRequest[] {
    return this.getRequestsFromStorage().filter(
      r => r.collectorId === collectorId && r.status !== 'rejected'
    );
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
          item.collectorId === collector.id &&
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
      !request || request.collectorId !== collectorId ||
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

  approveProposedTime(requestId: string): boolean {
    if (!this.authService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) return false;
    const requests = this.getRequestsFromStorage();
    const request = requests.find(item => item.id === requestId);
    if (!request || request.status !== 'time-proposed' || !request.proposedCollectionDate || !request.proposedCollectionTime) return false;

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
      'on-the-way': 'collected',
      collected: 'completed'
    };
    if (!request || request.collectorId !== collectorId || allowedNext[request.status] !== newStatus) return false;

    request.status = newStatus;
    this.recordStatus(request, newStatus, `Collector updated status to ${newStatus}`);
    if (newStatus === 'completed') {
      request.completionTime = new Date();
      request.completedAt = request.completionTime;
      request.greenPoints = this.calculateGreenPoints(request);
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
          request.greenPoints = this.calculateGreenPoints(request);
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
      request.greenPoints = this.calculateGreenPoints(request);
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
        request.collectorId !== collectorId ||
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
    const scheduledAt = new Date(`${date}T${time}:00`);
    return !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() >= Date.now();
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

  private calculateGreenPoints(request: WasteRequest): number {
    // Base points per waste type
    const points = (request.wasteTypes?.length || 1) * 10;
    
    // Bonus for on-time completion (if completed within 24 hours)
    const createdAtTime = request.createdAt ? new Date(request.createdAt).getTime() : 0;
    const timeDiff = new Date().getTime() - createdAtTime;
    const hoursElapsed = timeDiff / (1000 * 60 * 60);
    
    if (hoursElapsed <= 24) {
      return points + 5;
    }
    
    return points;
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
