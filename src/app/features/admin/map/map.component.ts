import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { RequestService } from '../../../core/services/request.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { LocationService, ZanzibarPlace, ZANZIBAR_DEFAULT_CENTER } from '../../../core/services/location.service';
import { WasteRequest, RequestStatus } from '../../../core/models/request.model';
import { User } from '../../../core/models/user.model';

type EntityFilterType = 'ALL' | 'REQUESTS' | 'USERS';
type StatusFilterType = 'ALL' | 'PENDING' | 'ASSIGNED' | 'TIME_PROPOSED' | 'RESCHEDULE_REQUIRED' | 'SCHEDULED' | 'ON_THE_WAY' | 'COLLECTED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED';

@Component({
  selector: 'app-admin-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef?: ElementRef;

  private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private searchMarkerLayer?: L.LayerGroup;
  private subscriptions = new Subscription();
  private isBrowser: boolean;
  private locationService: LocationService;

  // Zanzibar, Tanzania testing default center coordinates
  readonly defaultCenter: [number, number] = [ZANZIBAR_DEFAULT_CENTER.lat, ZANZIBAR_DEFAULT_CENTER.lng];
  readonly defaultZoom: number = 12;

  // Data
  requests: WasteRequest[] = [];
  users: User[] = [];
  filteredRequests: WasteRequest[] = [];
  filteredUsers: User[] = [];

  // Filter & Search states
  entityFilter: EntityFilterType = 'ALL';
  statusFilter: StatusFilterType = 'ALL';
  searchTerm: string = '';
  noLocationsFound: boolean = false;
  noLocationFound: boolean = false;

  // Searched place in Zanzibar
  searchedPlace: ZanzibarPlace | null = null;
  popularPlaces: string[] = ['Zanzibar City', 'Stone Town', 'Mjini Magharibi', 'Nungwi', 'Paje'];

  // Selected marker detail
  selectedItem: { type: 'request' | 'user' | 'place'; data: any } | null = null;

  constructor(
    private requestService: RequestService,
    private userService: UserService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object,
    locationService?: LocationService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.locationService = locationService || new LocationService();
  }

  ngOnInit(): void {
    this.loadData();

    this.subscriptions.add(
      this.requestService.requests$.subscribe(() => {
        this.loadData();
        this.updateMapMarkers();
      })
    );

    this.subscriptions.add(
      this.userService.users$.subscribe(() => {
        this.loadData();
        this.updateMapMarkers();
      })
    );
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        this.initMap();
        this.updateMapMarkers();
      }, 50);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  loadData(): void {
    this.requests = this.requestService.getAllRequests();
    this.users = this.userService.getAllUsers().filter(u => u.role === 'NORMAL_USER');
    this.applyFilters();
  }

  initMap(): void {
    if (!this.isBrowser || this.map) return;

    const container = this.mapContainerRef?.nativeElement || document.getElementById('leaflet-map');
    if (!container) return;

    // Default center on Zanzibar, Tanzania
    this.map = L.map(container, {
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.searchMarkerLayer = L.layerGroup().addTo(this.map);

    // Invalidate size on container change
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  setEntityFilter(filter: EntityFilterType): void {
    this.entityFilter = filter;
    this.applyFilters();
    this.updateMapMarkers();
  }

  setStatusFilter(filter: StatusFilterType): void {
    this.statusFilter = filter;
    this.applyFilters();
    this.updateMapMarkers();
  }

  onSearchChange(): void {
    this.applyFilters();
    this.updateMapMarkers();
  }

  selectPlace(placeName: string): void {
    this.searchTerm = placeName;
    this.applyFilters();
    this.updateMapMarkers();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchedPlace = null;
    this.selectedItem = null;
    this.applyFilters();
    this.updateMapMarkers();
    if (this.map) {
      this.map.setView(this.defaultCenter, this.defaultZoom);
    }
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').trim();
    const lowerTerm = term.toLowerCase();

    // 1. Check if the search term matches a known Zanzibar city/place
    if (term) {
      const placeMatch = this.locationService.searchZanzibarPlace(term);
      this.searchedPlace = placeMatch;
    } else {
      this.searchedPlace = null;
    }

    // 2. Filter Requests
    let reqs = [...this.requests];

    // Status Filter for Requests
    if (this.statusFilter !== 'ALL') {
      const targetStatus = this.statusFilter.toLowerCase().replace(/_/g, '-');
      reqs = reqs.filter(r => {
        const s = (r.status || '').toLowerCase();
        if (targetStatus === 'pending') {
          return s === 'pending' || s === 'received' || s === 'scheduling';
        }
        return s === targetStatus;
      });
    }

    // Search for Requests (ID, User ID, User Name, Location address, Waste Type)
    if (lowerTerm) {
      reqs = reqs.filter(r => {
        const idMatch = (r.id || '').toLowerCase().includes(lowerTerm);
        const userMatch = (r.userId || '').toLowerCase().includes(lowerTerm);
        const nameMatch = (r.userName || '').toLowerCase().includes(lowerTerm);
        const locMatch = (r.location?.address || '').toLowerCase().includes(lowerTerm);
        const wasteMatch = (r.wasteTypes || []).join(' ').toLowerCase().includes(lowerTerm);
        return idMatch || userMatch || nameMatch || locMatch || wasteMatch;
      });
    }

    // Filter only those with valid coordinates
    this.filteredRequests = reqs.filter(r => this.isValidCoordinate(r.location?.latitude, r.location?.longitude));

    // 3. Filter Users
    let usrs = [...this.users];
    if (lowerTerm) {
      usrs = usrs.filter(u => {
        const idMatch = (u.id || '').toLowerCase().includes(lowerTerm);
        const nameMatch = (u.fullName || '').toLowerCase().includes(lowerTerm);
        const emailMatch = (u.email || '').toLowerCase().includes(lowerTerm);
        const locMatch = (u.location?.address || '').toLowerCase().includes(lowerTerm);
        return idMatch || nameMatch || emailMatch || locMatch;
      });
    }

    // Filter only those with valid coordinates
    this.filteredUsers = usrs.filter(u => this.isValidCoordinate(u.location?.latitude, u.location?.longitude));

    // Entity Visibility Filter
    if (this.entityFilter === 'REQUESTS') {
      this.filteredUsers = [];
    } else if (this.entityFilter === 'USERS') {
      this.filteredRequests = [];
    }

    // Determine if no locations found
    const hasAnyResults = this.searchedPlace !== null || this.filteredRequests.length > 0 || this.filteredUsers.length > 0;
    this.noLocationsFound = !hasAnyResults;
    this.noLocationFound = !hasAnyResults;
  }

  updateMapMarkers(): void {
    if (!this.map || !this.markersLayer || !this.searchMarkerLayer) return;

    this.markersLayer.clearLayers();
    this.searchMarkerLayer.clearLayers();

    const bounds: L.LatLngBounds = L.latLngBounds([]);
    let hasMarkers = false;

    // 1. Add Searched Place Marker if active
    if (this.searchedPlace && this.isValidCoordinate(this.searchedPlace.lat, this.searchedPlace.lng)) {
      const place = this.searchedPlace;
      const icon = this.createSearchedPlaceMarkerIcon();
      const marker = L.marker([place.lat, place.lng], { icon, zIndexOffset: 1000 });
      const popupContent = this.createSearchedPlacePopupHtml(place);
      marker.bindPopup(popupContent, { maxWidth: 320, className: 'custom-leaflet-popup' });

      marker.on('click', () => {
        this.selectedItem = { type: 'place', data: place };
      });

      this.searchMarkerLayer.addLayer(marker);
      bounds.extend([place.lat, place.lng]);
      hasMarkers = true;

      // Automatically open popup and pan to searched place
      setTimeout(() => {
        if (this.map) {
          this.map.setView([place.lat, place.lng], 14, { animate: true });
          marker.openPopup();
        }
      }, 100);
    }

    // 2. Add Request Markers
    for (const req of this.filteredRequests) {
      const lat = req.location?.latitude!;
      const lng = req.location?.longitude!;
      const status = this.getNormalizedStatus(req.status);
      const icon = this.createRequestMarkerIcon(status);

      const marker = L.marker([lat, lng], { icon });
      const popupContent = this.createRequestPopupHtml(req);
      marker.bindPopup(popupContent, { maxWidth: 320, className: 'custom-leaflet-popup' });

      marker.on('click', () => {
        this.selectedItem = { type: 'request', data: req };
      });

      this.markersLayer.addLayer(marker);
      bounds.extend([lat, lng]);
      hasMarkers = true;
    }

    // 3. Add User Markers
    for (const usr of this.filteredUsers) {
      const lat = usr.location?.latitude!;
      const lng = usr.location?.longitude!;
      const icon = this.createUserMarkerIcon();

      const marker = L.marker([lat, lng], { icon });
      const popupContent = this.createUserPopupHtml(usr);
      marker.bindPopup(popupContent, { maxWidth: 320, className: 'custom-leaflet-popup' });

      marker.on('click', () => {
        this.selectedItem = { type: 'user', data: usr };
      });

      this.markersLayer.addLayer(marker);
      bounds.extend([lat, lng]);
      hasMarkers = true;
    }

    // Auto fit bounds if multiple markers exist and not searching single place
    if (hasMarkers && bounds.isValid() && !this.searchedPlace) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (!hasMarkers && !this.searchedPlace && this.map) {
      // Default to Zanzibar overview
      this.map.setView(this.defaultCenter, this.defaultZoom);
    }
  }

  isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
    return this.locationService.isValidCoordinate(lat, lng);
  }

  hasValidLocation(item: any): boolean {
    if (!item || !item.location) return false;
    return this.isValidCoordinate(item.location.latitude, item.location.longitude);
  }

  private getNormalizedStatus(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'time-proposed') return 'Time Proposed';
    if (s === 'reschedule-required') return 'Reschedule Required';
    if (s === 'on-the-way') return 'On the Way';
    if (s === 'assigned' || s === 'scheduled' || s === 'collected') {
      return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    switch (s) {
      case 'accepted': return 'Accepted';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  }

  private createSearchedPlaceMarkerIcon(): L.DivIcon {
    const html = `
      <div class="custom-map-pin pin-search-place">
        <span class="pin-icon">📍</span>
        <div class="pin-pulse"></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-pin-wrapper',
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -36]
    });
  }

  private createRequestMarkerIcon(status: string): L.DivIcon {
    const s = status.toLowerCase();
    let bg = '#D97706'; // pending - amber
    let emoji = '📦';

    if (['assigned', 'scheduled', 'accepted'].includes(s)) {
      bg = '#15803D'; // accepted - green
      emoji = '✅';
    } else if (['time-proposed', 'reschedule-required', 'on-the-way', 'collected'].includes(s)) {
      bg = '#0F766E';
      emoji = '🚚';
    } else if (s === 'completed') {
      bg = '#0284C7'; // completed - blue
      emoji = '♻️';
    } else if (s === 'rejected') {
      bg = '#DC2626'; // rejected - red
      emoji = '❌';
    }

    const html = `
      <div class="custom-map-pin pin-${s}" style="background-color: ${bg};">
        <span class="pin-icon">${emoji}</span>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-pin-wrapper',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32]
    });
  }

  private createUserMarkerIcon(): L.DivIcon {
    const html = `
      <div class="custom-map-pin pin-user" style="background-color: #4F46E5;">
        <span class="pin-icon">👤</span>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-pin-wrapper',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32]
    });
  }

  private createSearchedPlacePopupHtml(place: ZanzibarPlace): string {
    return `
      <div class="map-popup-card place-popup">
        <div class="popup-header place-hdr">
          <span class="popup-tag place-tag">📍 Searched Place (${place.category})</span>
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <span class="lbl">Place Name:</span>
            <span class="val font-bold highlight">${place.name}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Region:</span>
            <span class="val">Zanzibar, Tanzania</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Coordinates:</span>
            <span class="val font-mono">${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">About:</span>
            <span class="val">${place.description}</span>
          </div>
        </div>
      </div>
    `;
  }

  private createRequestPopupHtml(req: WasteRequest): string {
    const status = this.getNormalizedStatus(req.status);
    const dateStr = req.confirmedCollectionDate
      ? `${req.confirmedCollectionDate} ${req.confirmedCollectionTime || ''}`
      : req.preferredDate
        ? `${req.preferredDate} ${req.preferredTime || ''} (preferred)`
        : 'Not scheduled';
    const wasteTypes = (req.wasteTypes || []).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ') || 'General';
    const hasLoc = this.hasValidLocation(req);
    const locationText = hasLoc ? `📍 ${req.location.address}` : '<span class="text-danger">⚠️ No location found</span>';

    return `
      <div class="map-popup-card">
        <div class="popup-header request-hdr">
          <span class="popup-tag">Collection Request</span>
          <span class="status-pill status-${status.toLowerCase()}">${status}</span>
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <span class="lbl">Request ID:</span>
            <span class="val font-mono highlight">${req.id}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">User ID:</span>
            <span class="val font-mono">${req.userId || 'USER01'}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">User:</span>
            <span class="val font-bold">${req.userName || 'Normal User'}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Waste Type:</span>
            <span class="val">${wasteTypes}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Status:</span>
            <span class="val font-bold">${status}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Date:</span>
            <span class="val">${dateStr}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Location:</span>
            <span class="val">${locationText}</span>
          </div>
        </div>
      </div>
    `;
  }

  private createUserPopupHtml(user: User): string {
    const statusText = user.isActive ? 'Active' : 'Inactive';
    const hasLoc = this.hasValidLocation(user);
    const locationText = hasLoc ? `📍 ${user.location.address}` : '<span class="text-danger">⚠️ No location found</span>';

    return `
      <div class="map-popup-card">
        <div class="popup-header user-hdr">
          <span class="popup-tag user-tag">User Location</span>
          <span class="status-pill ${user.isActive ? 'status-active' : 'status-inactive'}">${statusText}</span>
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <span class="lbl">User ID:</span>
            <span class="val font-mono highlight">${user.id}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Full Name:</span>
            <span class="val font-bold">${user.fullName}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Email:</span>
            <span class="val">${user.email}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Location:</span>
            <span class="val">${locationText}</span>
          </div>
          <div class="popup-row">
            <span class="lbl">Status:</span>
            <span class="val font-bold">${statusText}</span>
          </div>
        </div>
      </div>
    `;
  }

  get totalVisibleCount(): number {
    return (this.searchedPlace ? 1 : 0) + this.filteredRequests.length + this.filteredUsers.length;
  }

  resetView(): void {
    this.searchTerm = '';
    this.searchedPlace = null;
    this.selectedItem = null;
    this.searchMarkerLayer?.clearLayers();
    if (this.map) {
      this.map.setView(this.defaultCenter, this.defaultZoom);
    }
    this.applyFilters();
    this.updateMapMarkers();
  }
}

