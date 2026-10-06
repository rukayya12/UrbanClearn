export type WasteType = 'plastic' | 'organic' | 'liquid' | 'paper' | 'food-waste';
export type RequestStatus =
  | 'pending'
  | 'assigned'
  | 'time-proposed'
  | 'reschedule-required'
  | 'scheduled'
  | 'on-the-way'
  | 'collected'
  | 'received'
  | 'processed'
  | 'scheduling'
  | 'accepted'
  | 'rejected'
  | 'completed';
export type RequestPriority = 'low' | 'medium' | 'high' | 'critical';

export interface WasteRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone: string;
  wasteTypes: WasteType[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description?: string;
  requestedTime: Date;
  preferredDate?: string;
  preferredTime?: string;
  proposedCollectionDate?: string;
  proposedCollectionTime?: string;
  confirmedCollectionDate?: string;
  confirmedCollectionTime?: string;
  status: RequestStatus;
  statusHistory: StatusChange[];
  collectorId?: string;
  collectorName?: string;
  assignedAt?: Date;
  recyclingCentreId?: string;
  estimatedArrival?: Date;
  completionTime?: Date;
  completedAt?: Date;
  greenPoints?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusChange {
  status: RequestStatus;
  timestamp: Date;
  notes?: string;
}

export type WasteReportType =
  | 'Uncollected Waste'
  | 'Overflowing Waste'
  | 'Illegal Dumping'
  | 'Waste Collection Problem'
  | 'Other';

export type WasteReportStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';

export interface WasteReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportType: WasteReportType;
  description: string;
  location: string;
  status: WasteReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface RequestFilter {
  status?: RequestStatus;
  wasteType?: WasteType;
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  collectorId?: string;
}
