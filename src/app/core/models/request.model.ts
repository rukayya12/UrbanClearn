export type WasteType = 'plastic' | 'organic' | 'liquid' | 'paper' | 'food-waste';
export type RequestStatus = 'pending' | 'received' | 'processed' | 'scheduling' | 'accepted' | 'rejected' | 'completed';
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
  status: RequestStatus;
  statusHistory: StatusChange[];
  collectorId?: string;
  collectorName?: string;
  recyclingCentreId?: string;
  estimatedArrival?: Date;
  completionTime?: Date;
  greenPoints?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusChange {
  status: RequestStatus;
  timestamp: Date;
  notes?: string;
}

export interface WasteReport {
  id: string;
  reporterId: string;
  reporterName: string;
  description: string;
  priority: RequestPriority;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  imageUrl?: string;
  status: 'pending' | 'under-review' | 'resolved';
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
