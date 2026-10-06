import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LocationService } from '../../../core/services/location.service';
import { UserService } from '../../../core/services/user.service';
import { Collector } from '../../../core/models/user.model';

@Component({
  selector: 'app-collectors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="page-header"><div><span class="eyebrow">SUPER ADMIN</span><h1>Collectors</h1><p>Register collection staff and keep their availability and registered location current.</p></div><span class="count">{{ collectors.length }} collectors</span></header>

      <section class="content-grid">
        <form class="form-panel" #collectorForm="ngForm" (ngSubmit)="addCollector(collectorForm)" novalidate>
          <h2>Register Collector</h2>
          <div *ngIf="message" class="feedback" [class.error]="messageType === 'error'" role="status">{{ message }}</div>
          <div class="field"><label for="fullName">Full Name *</label><input id="fullName" name="fullName" [(ngModel)]="form.fullName" required maxlength="100" /></div>
          <div class="field"><label for="email">Email *</label><input id="email" name="email" type="email" [(ngModel)]="form.email" required email maxlength="160" /></div>
          <div class="field-row">
            <div class="field"><label for="phone">Phone *</label><input id="phone" name="phone" [(ngModel)]="form.phone" required maxlength="30" /></div>
            <div class="field"><label for="password">Temporary Password *</label><input id="password" name="password" type="password" [(ngModel)]="form.password" required minlength="8" /></div>
          </div>
          <div class="field"><label for="address">Registered Location *</label><input id="address" name="address" [(ngModel)]="form.address" (blur)="resolveLocation()" required maxlength="200" placeholder="Town, district, or street" /></div>
          <div class="field-row">
            <div class="field"><label for="latitude">Latitude (optional)</label><input id="latitude" name="latitude" type="number" [(ngModel)]="form.latitude" step="any" /></div>
            <div class="field"><label for="longitude">Longitude (optional)</label><input id="longitude" name="longitude" type="number" [(ngModel)]="form.longitude" step="any" /></div>
          </div>
          <p class="coordinate-note">Distance recommendations use these stored coordinates when valid. No live GPS tracking is used.</p>
          <button class="primary-button" type="submit">Add Collector</button>
        </form>

        <section class="list-section">
          <h2>Registered Collectors</h2>
          <article *ngFor="let collector of collectors" class="collector-card">
            <div class="collector-top"><div><strong class="collector-id">{{ collector.id }}</strong><h3>{{ collector.fullName }}</h3><p>{{ collector.email }}</p></div><span class="availability" [class.available]="collector.availability === 'available'">{{ collector.availability }}</span></div>
            <dl><div><dt>Location</dt><dd>{{ collector.location.address || 'Not provided' }}</dd></div><div><dt>Coordinates</dt><dd>{{ hasCoordinates(collector) ? (collector.location.latitude + ', ' + collector.location.longitude) : 'Distance unavailable' }}</dd></div><div><dt>Completed Collections</dt><dd>{{ collector.completedCollections }}</dd></div></dl>
            <label class="availability-control">Availability
              <select [ngModel]="collector.availability" [name]="'availability-' + collector.id" (ngModelChange)="setAvailability(collector.id, $event)">
                <option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option>
              </select>
            </label>
          </article>
          <div *ngIf="collectors.length === 0" class="empty-state"><h3>No Collectors registered</h3><p>Add a Collector with a registered location to make them available for Admin assignment.</p></div>
        </section>
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; color:#17211b; } .page { max-width:1160px; margin:0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; margin-bottom:22px; }
    .eyebrow { color:#15803d; font-size:11px; font-weight:800; letter-spacing:1px; } h1 { margin:6px 0; font-size:27px; }
    .page-header p { margin:0; color:#64748b; font-size:13px; } .count { padding:8px 11px; border-radius:5px; background:#dcfce7; color:#166534; font-size:12px; font-weight:800; white-space:nowrap; }
    .content-grid { display:grid; grid-template-columns:minmax(280px,.85fr) minmax(0,1.15fr); gap:18px; align-items:start; }
    .form-panel,.collector-card,.empty-state { padding:18px; border:1px solid #dce8df; border-radius:7px; background:#fff; }
    h2 { margin:0 0 16px; font-size:18px; } .field { display:grid; gap:5px; margin-bottom:13px; min-width:0; }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; } label { color:#365343; font-size:12px; font-weight:700; }
    input,select { width:100%; min-width:0; height:39px; padding:8px 10px; border:1px solid #c8d5cc; border-radius:5px; background:#fff; font:inherit; }
    input:focus,select:focus { outline:2px solid #86efac; border-color:#15803d; } .coordinate-note { color:#64748b; font-size:11px; line-height:1.5; }
    .primary-button { width:100%; min-height:42px; border:0; border-radius:5px; background:#15803d; color:#fff; font-weight:800; cursor:pointer; }
    .feedback { margin-bottom:12px; padding:10px; border-radius:5px; background:#dcfce7; color:#166534; font-size:12px; } .feedback.error { background:#fee4e2; color:#912018; }
    .list-section { display:grid; gap:10px; } .list-section h2 { margin-bottom:2px; }
    .collector-top { display:flex; justify-content:space-between; gap:12px; } .collector-id { color:#166534; font-family:ui-monospace,monospace; font-size:12px; }
    .collector-card h3 { margin:5px 0 3px; font-size:15px; } .collector-card p { margin:0; color:#64748b; font-size:12px; overflow-wrap:anywhere; }
    .availability { height:max-content; padding:5px 8px; border-radius:999px; background:#fee4e2; color:#912018; font-size:10px; font-weight:800; text-transform:capitalize; }
    .availability.available { background:#dcfce7; color:#166534; } dl { display:grid; gap:8px; margin:14px 0; }
    dl div { display:flex; justify-content:space-between; gap:12px; font-size:12px; } dt { color:#64748b; } dd { margin:0; text-align:right; overflow-wrap:anywhere; }
    .availability-control { display:grid; grid-template-columns:1fr 150px; align-items:center; gap:10px; }
    .empty-state { text-align:center; } .empty-state p { color:#64748b; font-size:13px; }
    @media(max-width:780px) { .content-grid { grid-template-columns:1fr; } }
    @media(max-width:460px) { .page-header { align-items:flex-start; flex-direction:column; } .field-row { grid-template-columns:1fr; gap:0; } .availability-control { grid-template-columns:1fr; } }
  `]
})
export class CollectorsComponent {
  collectors: Collector[] = [];
  message = '';
  messageType: 'success' | 'error' = 'success';
  form = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null
  };
  private usersSubscription: Subscription;

  constructor(private userService: UserService, private locationService: LocationService) {
    this.loadCollectors();
    this.usersSubscription = this.userService.users$.subscribe(() => this.loadCollectors());
  }

  ngOnDestroy(): void {
    this.usersSubscription.unsubscribe();
  }

  resolveLocation(): void {
    const place = this.locationService.searchZanzibarPlace(this.form.address);
    if (place) {
      this.form.latitude = place.lat;
      this.form.longitude = place.lng;
    }
  }

  hasCoordinates(collector: Collector): boolean {
    return this.locationService.isValidCoordinate(collector.location.latitude, collector.location.longitude);
  }

  addCollector(form: { valid: boolean | null; control: { markAllAsTouched(): void } }): void {
    this.message = '';
    if (!form.valid) {
      form.control.markAllAsTouched();
      this.messageType = 'error';
      this.message = 'Complete the required Collector details.';
      return;
    }
    this.resolveLocation();
    const collector = this.userService.addCollector({
      ...this.form,
      latitude: this.form.latitude ?? 0,
      longitude: this.form.longitude ?? 0,
      availability: 'available'
    });
    if (!collector) {
      this.messageType = 'error';
      this.message = 'A user with that email already exists.';
      return;
    }
    this.messageType = 'success';
    this.message = `${collector.id} registered successfully.`;
    this.form = { fullName: '', email: '', phone: '', password: '', address: '', latitude: null, longitude: null };
  }

  setAvailability(collectorId: string, availability: Collector['availability']): void {
    this.userService.updateCollectorAvailability(collectorId, availability);
  }

  private loadCollectors(): void {
    this.collectors = this.userService.getCollectors();
  }
}
