export type UserRole = 'super-admin' | 'admin' | 'normal-user' | 'collector' | 'recycling-centre';

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
  email: string;
  phone: string;
  password: string; // Mock only - never store in production
  role: UserRole;
  location: Location;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
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
