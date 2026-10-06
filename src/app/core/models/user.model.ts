export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'NORMAL_USER' | 'COLLECTOR' | 'RECYCLING_CENTRE';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  region: string;
  district: string;
  city: string;
}

export interface User {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  phone: string;
  password: string; // Mock only - never store in production
  role: UserRole;
  location: Location;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastLogin?: Date;
  isOnline?: boolean;
  profileImage?: string;
  bio?: string;
}

export interface Collector extends User {
  availability: 'available' | 'busy' | 'offline';
  totalCollections: number;
  completedCollections: number;
  rating: number;
  vehicleType?: string;
  capacity?: number;
}

export interface RecyclingCentre extends User {
  centreType: string;
  capacity: number;
  processingCapacity: number;
  certifications?: string[];
  operatingHours?: {
    open: string;
    close: string;
  };
}

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
  token: string; // Mock token
  loginTime: Date;
  lastActivityTime: Date;
}

/**
 * Generates the next sequential User ID: USER01, USER02, USER03, ...
 * Every newly registered user automatically receives the next sequential ID.
 */
export function generateNextUserId(existingUsers: { id?: string; role?: string }[] = []): string {
  const userIds = existingUsers
    .map(u => u.id || '')
    .filter(id => /^USER\d+$/i.test(id));

  let maxNum = 0;
  for (const id of userIds) {
    const num = parseInt(id.replace(/^USER/i, ''), 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  const padded = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
  return `USER${padded}`;
}

