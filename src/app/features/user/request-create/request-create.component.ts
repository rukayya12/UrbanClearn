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
      latitude: [this.currentUser?.location.latitude || '', Validators.required],
      longitude: [this.currentUser?.location.longitude || '', Validators.required],
      address: [this.currentUser?.location.address || '', Validators.required],
      requestedTime: [new Date().toISOString().slice(0, 16), Validators.required],
      description: ['']
    });
  }

  getCurrentLocation(): void {
    if (this.currentUser) {
      this.requestForm.patchValue({
        latitude: this.currentUser.location.latitude,
        longitude: this.currentUser.location.longitude,
        address: this.currentUser.location.address
      });
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
    const requestedTime = new Date(formValue.requestedTime);

    this.requestService.createRequest(
      this.selectedWasteTypes,
      parseFloat(formValue.latitude),
      parseFloat(formValue.longitude),
      formValue.address,
      requestedTime,
      formValue.description
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
