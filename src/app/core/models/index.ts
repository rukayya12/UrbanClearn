export type NotificationType = 'request-submitted' | 'collector-assigned' | 'request-accepted' | 
  'request-rejected' | 'collection-completed' | 'reminder' | 'suggestion' | 'missed-cycle' | 'system';

export interface Notification {
  id: string;
  userId: string;
  targetRole?: 'ADMIN' | 'NORMAL_USER' | 'COLLECTOR' | 'ALL';
  recipientRole?: 'ADMIN' | 'NORMAL_USER' | 'COLLECTOR' | 'ALL';
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  requestId?: string;
  targetUserId?: string;
  userName?: string;
}

export interface Analytics {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  wasteDistribution: { [key: string]: number };
  requestsByStatus: { [key: string]: number };
  collectorPerformance: {
    collectorId: string;
    name: string;
    completedRequests: number;
    averageRating: number;
    totalDistance: number;
  }[];
  requestsOverTime: {
    date: Date;
    count: number;
  }[];
  recyclingRatio: number;
}

export interface Prediction {
  userId: string;
  userName: string;
  riskLevel: 'low' | 'medium' | 'high';
  predictionScore: number;
  preferredDay?: string;
  preferredTime?: string;
  averageRequestInterval?: number;
  missCount?: number;
  lastAnalysisDate: Date;
}
