import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section class="page" *ngIf="currentUser as user">
      <div class="profile-heading">
        <div class="avatar">{{ user.fullName.charAt(0) || 'U' }}</div>
        <div class="heading-info">
          <p class="eyebrow">USER PROFILE</p>
          <h1>{{ user.fullName }}</h1>
          <p class="role-badge">{{ user.role }} <span *ngIf="user.username">• &#64;{{ user.username }}</span></p>
        </div>
        <div class="heading-actions">
          <button *ngIf="!isEditing" (click)="enableEdit()" class="btn btn-primary">
            ✏️ Edit Profile
          </button>
        </div>
      </div>

      <div *ngIf="successMessage" class="alert alert-success">
        {{ successMessage }}
      </div>
      <div *ngIf="errorMessage" class="alert alert-danger">
        {{ errorMessage }}
      </div>

      <!-- View Mode -->
      <div class="profile-card" *ngIf="!isEditing">
        <div>
          <span>Full Name</span>
          <strong>{{ user.fullName }}</strong>
        </div>
        <div>
          <span>Username</span>
          <strong>{{ user.username ? ('@' + user.username) : 'Not set' }}</strong>
        </div>
        <div>
          <span>Email Address</span>
          <strong>{{ user.email }}</strong>
        </div>
        <div>
          <span>Phone Number</span>
          <strong>{{ user.phone || 'Not provided' }}</strong>
        </div>
        <div>
          <span>Account Role</span>
          <strong>{{ user.role }}</strong>
        </div>
        <div>
          <span>Account Status</span>
          <strong [class.inactive]="!user.isActive">{{ user.isActive ? 'Active' : 'Inactive' }}</strong>
        </div>
        <div>
          <span>Street Address</span>
          <strong>{{ user.location?.address || 'Not specified' }}</strong>
        </div>
        <div>
          <span>City / District</span>
          <strong>{{ (user.location?.city || 'Zanzibar') + ', ' + (user.location?.district || 'Urban') }}</strong>
        </div>
        <div>
          <span>Region</span>
          <strong>{{ user.location?.region || 'Zanzibar' }}</strong>
        </div>
        <div>
          <span>Member Since</span>
          <strong>{{ user.createdAt | date:'mediumDate' }}</strong>
        </div>
      </div>

      <!-- Edit Mode Form -->
      <form *ngIf="isEditing" [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="edit-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="fullName">Full Name *</label>
            <input id="fullName" type="text" formControlName="fullName" class="form-control" />
          </div>

          <div class="form-group">
            <label for="username">Username</label>
            <input id="username" type="text" formControlName="username" placeholder="e.g. jdoe" class="form-control" />
          </div>

          <div class="form-group">
            <label for="email">Email Address *</label>
            <input id="email" type="email" formControlName="email" class="form-control" />
          </div>

          <div class="form-group">
            <label for="phone">Phone Number *</label>
            <input id="phone" type="tel" formControlName="phone" class="form-control" />
          </div>

          <div class="form-group">
            <label for="address">Street Address</label>
            <input id="address" type="text" formControlName="address" class="form-control" />
          </div>

          <div class="form-group">
            <label for="city">City</label>
            <input id="city" type="text" formControlName="city" class="form-control" />
          </div>

          <div class="form-group">
            <label for="district">District</label>
            <input id="district" type="text" formControlName="district" class="form-control" />
          </div>

          <div class="form-group">
            <label for="region">Region</label>
            <input id="region" type="text" formControlName="region" class="form-control" />
          </div>

          <div class="form-group full-width">
            <label for="password">Change Password <small>(Leave blank to keep existing)</small></label>
            <input id="password" type="password" formControlName="password" placeholder="New password (min 6 chars)" class="form-control" />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" [disabled]="profileForm.invalid || isSaving" class="btn btn-primary">
            {{ isSaving ? 'Saving...' : '💾 Save Changes' }}
          </button>
          <button type="button" (click)="cancelEdit()" class="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; }
    .profile-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 24px; flex-wrap: wrap; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: #15803D; color: #fff; font-size: 26px; font-weight: 700; flex-shrink: 0; }
    .heading-info { flex: 1; min-width: 200px; }
    .eyebrow { color: #0D9488; letter-spacing: 2px; font-size: 11px; font-weight: 700; margin: 0 0 4px; text-transform: uppercase; }
    h1 { color: #17211B; margin: 0; font-size: 26px; }
    .role-badge { color: #64748B; margin: 4px 0 0; font-size: 13px; font-weight: 500; }
    .heading-actions { display: flex; gap: 10px; }
    .btn { padding: 10px 18px; border-radius: 6px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s ease; }
    .btn-primary { background: #15803D; color: #fff; &:hover { background: #166534; } }
    .btn-secondary { background: #fff; color: #17211B; border: 1px solid #cbdacf; &:hover { background: #f8faf9; } }
    .alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 18px; font-size: 13.5px; }
    .alert-success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .alert-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .profile-card { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #dcfce7; border: 1px solid #dcfce7; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(21,128,61,.06); }
    .profile-card div { background: #fff; padding: 18px 20px; }
    .profile-card span { display: block; color: #64748B; font-size: 12px; margin-bottom: 5px; }
    .profile-card strong { color: #17211B; font-size: 14px; overflow-wrap: anywhere; }
    .profile-card .inactive { color: #DC2626; }
    .edit-form { background: #fff; border: 1px solid #dcfce7; border-radius: 8px; padding: 24px; box-shadow: 0 4px 16px rgba(21,128,61,.06); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full-width { grid-column: 1 / -1; }
    label { font-size: 12.5px; font-weight: 600; color: #17211B; }
    label small { color: #64748B; font-weight: 400; }
    .form-control { padding: 9px 12px; border: 1px solid #cbdacf; border-radius: 6px; font-size: 13.5px; outline: none; transition: border-color 0.2s; &:focus { border-color: #15803D; } }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    @media(max-width:600px){ .profile-card, .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isEditing = false;
  isSaving = false;
  successMessage = '';
  errorMessage = '';
  profileForm!: FormGroup;
  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initForm();

    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!this.isEditing) {
        this.initForm();
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  initForm(): void {
    const u = this.currentUser;
    this.profileForm = this.formBuilder.group({
      fullName: [u?.fullName || '', [Validators.required, Validators.minLength(3)]],
      username: [u?.username || '', [Validators.minLength(3)]],
      email: [u?.email || '', [Validators.required, Validators.email]],
      phone: [u?.phone || '', [Validators.required]],
      address: [u?.location?.address || ''],
      city: [u?.location?.city || ''],
      district: [u?.location?.district || ''],
      region: [u?.location?.region || ''],
      password: ['', [Validators.minLength(6)]]
    });
  }

  enableEdit(): void {
    this.initForm();
    this.isEditing = true;
    this.successMessage = '';
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.initForm();
    this.errorMessage = '';
  }

  saveProfile(): void {
    if (this.profileForm.invalid || !this.currentUser) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formVal = this.profileForm.value;
    const updatedData: Partial<User> = {
      fullName: formVal.fullName.trim(),
      username: formVal.username ? formVal.username.trim() : undefined,
      email: formVal.email.trim(),
      phone: formVal.phone.trim(),
      location: {
        ...this.currentUser.location,
        address: formVal.address ? formVal.address.trim() : (this.currentUser.location?.address || ''),
        city: formVal.city ? formVal.city.trim() : (this.currentUser.location?.city || ''),
        district: formVal.district ? formVal.district.trim() : (this.currentUser.location?.district || ''),
        region: formVal.region ? formVal.region.trim() : (this.currentUser.location?.region || '')
      }
    };

    if (formVal.password && formVal.password.trim().length >= 6) {
      updatedData.password = formVal.password.trim();
    }

    this.authService.updateCurrentUser(updatedData).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success) {
          this.successMessage = 'Profile updated successfully!';
          this.isEditing = false;
        } else {
          this.errorMessage = res.message;
        }
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'Failed to update profile. Please try again.';
      }
    });
  }
}
