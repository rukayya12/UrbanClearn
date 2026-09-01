import { Injectable } from '@angular/core';
import { Collector, RecyclingCentre } from '../models/user.model';

interface CoordinateDistance {
  lat: number;
  lon: number;
  distance: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  // Earth's radius in meters
  private readonly EARTH_RADIUS_METERS = 6371000;
  private readonly SEARCH_RADIUS_METERS_FIRST = 500;
  private readonly SEARCH_RADIUS_METERS_SECOND = 1000;

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Find nearby collectors within specified radius
   */
  findNearbyCollectors(
    userLat: number,
    userLon: number,
    collectors: Collector[],
    radiusMeters: number = this.SEARCH_RADIUS_METERS_FIRST
  ): Collector[] {
    return collectors
      .filter(c => c.availability === 'available' && c.isActive)
      .map(collector => ({
        ...collector,
        distance: this.calculateDistance(
          userLat,
          userLon,
          collector.location.latitude,
          collector.location.longitude
        )
      }))
      .filter(c => c.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance) as any[];
  }

  /**
   * Find nearest collector with automatic fallback from 500m to 1km
   */
  findNearestCollector(
    userLat: number,
    userLon: number,
    collectors: Collector[]
  ): { collector: Collector; distance: number } | { collector: null; message: string } {
    // First try 500m radius
    let nearbyCollectors = this.findNearbyCollectors(
      userLat,
      userLon,
      collectors,
      this.SEARCH_RADIUS_METERS_FIRST
    );

    if (nearbyCollectors.length > 0) {
      const nearest = nearbyCollectors[0];
      return {
        collector: nearest,
        distance: this.calculateDistance(
          userLat,
          userLon,
          nearest.location.latitude,
          nearest.location.longitude
        )
      };
    }

    // Fallback to 1km radius
    nearbyCollectors = this.findNearbyCollectors(
      userLat,
      userLon,
      collectors,
      this.SEARCH_RADIUS_METERS_SECOND
    );

    if (nearbyCollectors.length > 0) {
      const nearest = nearbyCollectors[0];
      return {
        collector: nearest,
        distance: this.calculateDistance(
          userLat,
          userLon,
          nearest.location.latitude,
          nearest.location.longitude
        )
      };
    }

    return {
      collector: null,
      message: 'No collector found within 1km'
    };
  }

  /**
   * Find nearby recycling centres
   */
  findNearbyCentres(
    userLat: number,
    userLon: number,
    centres: RecyclingCentre[],
    radiusMeters: number = 5000
  ): RecyclingCentre[] {
    return centres
      .filter(c => c.isActive)
      .map(centre => ({
        ...centre,
        distance: this.calculateDistance(
          userLat,
          userLon,
          centre.location.latitude,
          centre.location.longitude
        )
      }))
      .filter(c => c.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance) as any[];
  }

  /**
   * Find nearest recycling centre
   */
  findNearestCentre(
    userLat: number,
    userLon: number,
    centres: RecyclingCentre[]
  ): RecyclingCentre | null {
    const nearbyCentres = this.findNearbyCentres(userLat, userLon, centres);
    return nearbyCentres.length > 0 ? nearbyCentres[0] : null;
  }

  /**
   * Get distance in human-readable format
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  }

  /**
   * Validate coordinates
   */
  isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  /**
   * Get bounds for a circle on map
   */
  getCircleBounds(
    centerLat: number,
    centerLon: number,
    radiusMeters: number
  ): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
    const latChange = (radiusMeters / this.EARTH_RADIUS_METERS) * (180 / Math.PI);
    const lonChange = (radiusMeters / this.EARTH_RADIUS_METERS) * (180 / Math.PI) / Math.cos(this.toRad(centerLat));

    return {
      minLat: centerLat - latChange,
      maxLat: centerLat + latChange,
      minLon: centerLon - lonChange,
      maxLon: centerLon + lonChange
    };
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
