import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  isNotRegistered = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isNotRegistered = false;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage = 'Please enter a valid email and password.';
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success) {
          this.isNotRegistered = false;
          this.successMessage = 'Login successful! Redirecting...';
          const role = this.authService.getCurrentRole();

          setTimeout(() => {
            switch (role) {
              case 'SUPER_ADMIN':
                this.router.navigate(['/super-admin/dashboard']);
                break;
              case 'ADMIN':
                this.router.navigate(['/admin/dashboard']);
                break;
              case 'NORMAL_USER':
                this.router.navigate(['/user/dashboard']);
                break;
              case 'COLLECTOR':
                this.router.navigate(['/collector/dashboard']);
                break;
              case 'RECYCLING_CENTRE':
                this.router.navigate(['/centre/dashboard']);
                break;
              default:
                this.router.navigate(['/user/dashboard']);
            }
          }, 400);
        } else {
          this.errorMessage = response.message;
          this.isNotRegistered = false;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.isNotRegistered = false;
        this.errorMessage = 'An error occurred. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}

