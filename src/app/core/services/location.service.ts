import { Injectable } from '@angular/core';
import { Collector, RecyclingCentre } from '../models/user.model';

interface CoordinateDistance {
  lat: number;
  lon: number;
  distance: number;
}

export interface ZanzibarPlace {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  description: string;
  category: 'City' | 'Town' | 'Region' | 'Beach' | 'Village' | 'District';
}

export const ZANZIBAR_DEFAULT_CENTER = {
  lat: -6.1659,
  lng: 39.2026,
  address: 'Zanzibar City, Tanzania'
};

export const ZANZIBAR_PLACES: ZanzibarPlace[] = [
  {
    name: 'Zanzibar City',
    aliases: ['zanzibar', 'zanzibar city', 'jiji la zanzibar', 'zanzibar town', 'mjini'],
    lat: -6.1659,
    lng: 39.2026,
    description: 'Capital and urban hub of Zanzibar, Tanzania',
    category: 'City'
  },
  {
    name: 'Stone Town',
    aliases: ['stone town', 'mji mkongwe', 'stonetown', 'shangani', 'forodhani'],
    lat: -6.1630,
    lng: 39.1890,
    description: 'Historic Stone Town (Mji Mkongwe), UNESCO World Heritage Site',
    category: 'Town'
  },
  {
    name: 'Mjini Magharibi',
    aliases: ['mjini magharibi', 'urban west', 'magharibi', 'urban west region', 'mjini/magharibi'],
    lat: -6.1639,
    lng: 39.2300,
    description: 'Mjini Magharibi (Urban West) Region, Zanzibar',
    category: 'Region'
  },
  {
    name: 'Nungwi',
    aliases: ['nungwi', 'nungwi beach', 'kaskazini nungwi', 'nungwi village'],
    lat: -5.7266,
    lng: 39.2977,
    description: 'Nungwi Beach & Fishing Hub, North Unguja',
    category: 'Beach'
  },
  {
    name: 'Paje',
    aliases: ['paje', 'paje beach', 'kusini paje', 'paje village'],
    lat: -6.2657,
    lng: 39.5342,
    description: 'Paje Beach & Coastal Centre, South East Coast of Zanzibar',
    category: 'Beach'
  },
  {
    name: 'Kendwa',
    aliases: ['kendwa', 'kendwa beach', 'kendwa rocks'],
    lat: -5.7533,
    lng: 39.2889,
    description: 'Kendwa Beach, North-West Unguja',
    category: 'Beach'
  },
  {
    name: 'Matemwe',
    aliases: ['matemwe', 'matemwe beach'],
    lat: -5.8700,
    lng: 39.3522,
    description: 'Matemwe Coastal Area, North East Unguja',
    category: 'Village'
  },
  {
    name: 'Kiwengwa',
    aliases: ['kiwengwa', 'kiwengwa beach'],
    lat: -5.9902,
    lng: 39.3789,
    description: 'Kiwengwa Beach, East Coast of Zanzibar',
    category: 'Beach'
  },
  {
    name: 'Jambiani',
    aliases: ['jambiani', 'jambiani beach'],
    lat: -6.3197,
    lng: 39.5447,
    description: 'Jambiani Coastal Village, South East Coast',
    category: 'Beach'
  },
  {
    name: 'Kizimkazi',
    aliases: ['kizimkazi', 'kizimkazi mkunguni', 'kizimkazi dimbani', 'dolphin bay'],
    lat: -6.4589,
    lng: 39.4678,
    description: 'Kizimkazi Dolphin Village, Southern Unguja',
    category: 'Village'
  },
  {
    name: 'Chwaka',
    aliases: ['chwaka', 'chwaka bay'],
    lat: -6.1667,
    lng: 39.4333,
    description: 'Chwaka Bay, Central-East Unguja',
    category: 'Village'
  },
  {
    name: 'Mwanakwerekwe',
    aliases: ['mwanakwerekwe', 'mwanakwerekwe market'],
    lat: -6.1608,
    lng: 39.2294,
    description: 'Mwanakwerekwe, Urban West District',
    category: 'Town'
  },
  {
    name: 'Kiembe Samaki',
    aliases: ['kiembe samaki', 'kiembesamaki'],
    lat: -6.1956,
    lng: 39.2244,
    description: 'Kiembe Samaki, near Abeid Amani Karume International Airport',
    category: 'Town'
  },
  {
    name: 'Chukwani',
    aliases: ['chukwani', 'chukwani bay'],
    lat: -6.2300,
    lng: 39.2150,
    description: 'Chukwani, Urban West District',
    category: 'Town'
  },
  {
    name: 'Fumba',
    aliases: ['fumba', 'fumba town', 'fumba peninsula'],
    lat: -6.3167,
    lng: 39.2833,
    description: 'Fumba Peninsula & Eco-Town, Zanzibar',
    category: 'Town'
  },
  {
    name: 'Fuoni',
    aliases: ['fuoni', 'fuoni bareball'],
    lat: -6.1750,
    lng: 39.2500,
    description: 'Fuoni, Urban West District',
    category: 'Town'
  },
  {
    name: 'Tunguu',
    aliases: ['tunguu', 'suza tunguu'],
    lat: -6.1367,
    lng: 39.3175,
    description: 'Tunguu, Central District, Zanzibar',
    category: 'Village'
  },
  {
    name: 'Mazizini',
    aliases: ['mazizini'],
    lat: -6.1850,
    lng: 39.2100,
    description: 'Mazizini, Urban West, Zanzibar',
    category: 'Town'
  },
  {
    name: 'Bububu',
    aliases: ['bububu'],
    lat: -6.1042,
    lng: 39.2167,
    description: 'Bububu, West District, Zanzibar',
    category: 'Town'
  },
  {
    name: 'Makunduchi',
    aliases: ['makunduchi'],
    lat: -6.4250,
    lng: 39.5483,
    description: 'Makunduchi, South Unguja',
    category: 'Village'
  },
  {
    name: 'Bwejuu',
    aliases: ['bwejuu', 'bwejuu beach'],
    lat: -6.2342,
    lng: 39.5297,
    description: 'Bwejuu, South East Coast',
    category: 'Beach'
  },
  {
    name: 'Mangapwani',
    aliases: ['mangapwani', 'mangapwani coral cave'],
    lat: -6.0000,
    lng: 39.1833,
    description: 'Mangapwani, North West Unguja',
    category: 'Village'
  },
  {
    name: 'Mkokotoni',
    aliases: ['mkokotoni', 'mkokotoni port'],
    lat: -5.8778,
    lng: 39.2556,
    description: 'Mkokotoni Port Town, North Unguja',
    category: 'Town'
  },
  {
    name: 'Mahonda',
    aliases: ['mahonda'],
    lat: -5.9833,
    lng: 39.2500,
    description: 'Mahonda, North Unguja',
    category: 'Village'
  },
  {
    name: 'Chake Chake',
    aliases: ['chake chake', 'chakechake'],
    lat: -5.2458,
    lng: 39.7681,
    description: 'Chake Chake, Pemba Island, Zanzibar',
    category: 'City'
  },
  {
    name: 'Wete',
    aliases: ['wete', 'wete pemba'],
    lat: -5.0567,
    lng: 39.7289,
    description: 'Wete Town, North Pemba Island, Zanzibar',
    category: 'Town'
  },
  {
    name: 'Mkoani',
    aliases: ['mkoani', 'mkoani port'],
    lat: -5.3583,
    lng: 39.6500,
    description: 'Mkoani Port, South Pemba Island, Zanzibar',
    category: 'Town'
  }
];

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  // Earth's radius in meters
  private readonly EARTH_RADIUS_METERS = 6371000;
  private readonly SEARCH_RADIUS_METERS_FIRST = 500;
  private readonly SEARCH_RADIUS_METERS_SECOND = 1000;

  /**
   * Search for a known Zanzibar place/city by name or keyword
   */
  searchZanzibarPlace(query: string): ZanzibarPlace | null {
    if (!query || !query.trim()) return null;
    const clean = query.trim().toLowerCase();

    // 1. Exact or alias match
    const found = ZANZIBAR_PLACES.find(p => 
      p.name.toLowerCase() === clean ||
      p.aliases.some(a => a.toLowerCase() === clean)
    );
    if (found) return found;

    // 2. Contains match
    const partialMatch = ZANZIBAR_PLACES.find(p =>
      p.name.toLowerCase().includes(clean) ||
      clean.includes(p.name.toLowerCase()) ||
      p.aliases.some(a => a.toLowerCase().includes(clean) || clean.includes(a.toLowerCase()))
    );

    return partialMatch || null;
  }

  /**
   * Get list of top recommended Zanzibar places for quick filtering
   */
  getTopZanzibarPlaces(): ZanzibarPlace[] {
    return ZANZIBAR_PLACES.slice(0, 5); // Zanzibar City, Stone Town, Mjini Magharibi, Nungwi, Paje
  }

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
  isValidCoordinate(lat?: number | null, lon?: number | null): boolean {
    if (lat === undefined || lon === undefined || lat === null || lon === null) return false;
    if (typeof lat !== 'number' || typeof lon !== 'number') return false;
    if (isNaN(lat) || isNaN(lon)) return false;
    if (lat === 0 && lon === 0) return false;
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
