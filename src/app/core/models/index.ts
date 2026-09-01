export type NotificationType = 'request-submitted' | 'collector-assigned' | 'request-accepted' | 
  'request-rejected' | 'collection-completed' | 'reminder' | 'suggestion' | 'missed-cycle' | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  requestId?: string;
}

export interface RewardTransaction {
  id: string;
  userId: string;
  points: number;
  type: 'earn' | 'redeem' | 'penalty';
  description: string;
  createdAt: Date;
  expiryDate?: Date;
}

export interface UserRewards {
  userId: string;
  totalPoints: number;
  transactionHistory: RewardTransaction[];
  redeemHistory: {
    redeemedPoints: number;
    rewardName: string;
    redeemDate: Date;
  }[];
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  currentMonthPoints: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  maxRedemptions?: number;
  expiryDate?: Date;
  category: string;
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
