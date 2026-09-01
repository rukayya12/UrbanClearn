import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  currentStep = 1;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(10)]],
      region: ['', Validators.required],
      district: ['', Validators.required],
      city: ['', Validators.required],
      location: ['', Validators.required],
      latitude: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      longitude: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getLocationFromCoordinates(): void {
    const lat = parseFloat(this.registerForm.get('latitude')?.value);
    const lon = parseFloat(this.registerForm.get('longitude')?.value);

    if (this.isValidCoordinate(lat, lon)) {
      // Mock geocoding - in a real app, you'd use a geocoding service
      const locationName = this.getMockLocationName(lat, lon);
      this.registerForm.patchValue({ location: locationName });
    }
  }

  private isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  private getMockLocationName(lat: number, lon: number): string {
    // Mock location names for Zanzibar coordinates
    if (lat < -6.14 && lon > 35.75) return 'Nungwi Area';
    if (lat > -6.20 && lat < -6.15 && lon > 35.74 && lon < 35.76) return 'Stone Town';
    if (lat > -6.22 && lat < -6.19 && lon > 35.74 && lon < 35.77) return 'Forodhani';
    if (lat > -6.18 && lat < -6.15 && lon > 35.73 && lon < 35.76) return 'Malindi';
    if (lat > -6.20 && lat < -6.16 && lon > 35.72 && lon < 35.76) return 'Bumbuli';
    if (lat < -6.21 && lon > 35.74) return 'Kizimkazi';
    if (lat > -6.16 && lat < -6.14 && lon > 35.73 && lon < 35.78) return 'Wete';
    
    return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  }

  register(): void {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }

    const formValue = this.registerForm.value;

    if (formValue.password !== formValue.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const newUser: User = {
      id: '',
      fullName: formValue.fullName,
      email: formValue.email,
      phone: formValue.phone,
      password: formValue.password,
      role: 'normal-user', // Default role for self-registration
      location: {
        latitude: parseFloat(formValue.latitude),
        longitude: parseFloat(formValue.longitude),
        address: formValue.location,
        region: formValue.region,
        district: formValue.district,
        city: formValue.city
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    this.authService.register(newUser).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success) {
          this.successMessage = 'Registration successful! Redirecting to login...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'An error occurred during registration. Please try again.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    
    if (!field || !field.errors) return '';

    if (field.errors['required']) return `${fieldName} is required`;
    if (field.errors['email']) return 'Please enter a valid email';
    if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
    if (field.errors['pattern']) return `${fieldName} has an invalid format`;
    if (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }

    return '';
  }
}
