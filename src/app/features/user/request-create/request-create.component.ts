import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { UserService } from '../../../core/services/user.service';
import { LocationService } from '../../../core/services/location.service';
import { WasteType } from '../../../core/models/request.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-request-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './request-create.component.html',
  styleUrls: ['./request-create.component.scss']
})
export class RequestCreateComponent implements OnInit {
  today = new Date().toISOString().slice(0, 10);
  requestForm!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  wasteTypeOptions: WasteType[] = ['plastic', 'organic', 'liquid', 'paper', 'food-waste'];
  selectedWasteTypes: WasteType[] = [];
  currentUser: User | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private requestService: RequestService,
    private authService: AuthService,
    private userService: UserService,
    private locationService: LocationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initializeForm();
    this.getCurrentLocation();
  }

  initializeForm(): void {
    this.requestForm = this.formBuilder.group({
      latitude: [''],
      longitude: [''],
      address: [this.currentUser?.location.address || '', Validators.required],
      preferredDate: [''],
      preferredTime: [''],
      description: ['']
    });
  }

  getCurrentLocation(): void {
    if (this.currentUser) {
      const knownPlace = this.locationService.searchZanzibarPlace(this.currentUser.location.address);
      const hasStoredCoordinates = this.locationService.isValidCoordinate(
        this.currentUser.location.latitude,
        this.currentUser.location.longitude
      ) && !(this.currentUser.location.latitude === -6.1639 && this.currentUser.location.longitude === 35.7461);
      this.requestForm.patchValue({
        latitude: knownPlace?.lat ?? (hasStoredCoordinates ? this.currentUser.location.latitude : ''),
        longitude: knownPlace?.lng ?? (hasStoredCoordinates ? this.currentUser.location.longitude : ''),
        address: this.currentUser.location.address
      });
    }
  }

  updateCoordinatesFromAddress(): void {
    const address = this.requestForm.get('address')?.value;
    const knownPlace = this.locationService.searchZanzibarPlace(address);
    if (knownPlace) {
      this.requestForm.patchValue({ latitude: knownPlace.lat, longitude: knownPlace.lng });
    }
  }

  toggleWasteType(type: WasteType): void {
    const index = this.selectedWasteTypes.indexOf(type);
    if (index > -1) {
      this.selectedWasteTypes.splice(index, 1);
    } else {
      this.selectedWasteTypes.push(type);
    }
  }

  createRequest(): void {
    if (this.requestForm.invalid || this.selectedWasteTypes.length === 0) {
      this.errorMessage = 'Please fill all required fields and select at least one waste type';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.requestForm.value;
    const requestedTime = formValue.preferredDate && formValue.preferredTime
      ? new Date(`${formValue.preferredDate}T${formValue.preferredTime}`)
      : new Date();
    const hasCoordinatePair = formValue.latitude !== '' && formValue.longitude !== '';

    this.requestService.createRequest(
      this.selectedWasteTypes,
      hasCoordinatePair ? Number(formValue.latitude) : 0,
      hasCoordinatePair ? Number(formValue.longitude) : 0,
      formValue.address,
      requestedTime,
      formValue.description,
      formValue.preferredDate || undefined,
      formValue.preferredTime || undefined
    ).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success) {
          this.successMessage = `Request created successfully! Request ID: ${response.requestId}`;
          setTimeout(() => {
            this.router.navigate(['/user/requests']);
          }, 1500);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'An error occurred. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/user/dashboard']);
  }
}
