import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success) {
          this.successMessage = 'Login successful! Redirecting...';
          const role = this.authService.getCurrentRole();

          setTimeout(() => {
            switch (role) {
              case 'super-admin':
                this.router.navigate(['/super-admin/dashboard']);
                break;
              case 'admin':
                this.router.navigate(['/admin/dashboard']);
                break;
              case 'normal-user':
                this.router.navigate(['/user/dashboard']);
                break;
              case 'collector':
                this.router.navigate(['/collector/dashboard']);
                break;
              case 'recycling-centre':
                this.router.navigate(['/centre/dashboard']);
                break;
              default:
                this.router.navigate(['/login']);
            }
          }, 500);
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

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  fillDemoAccount(role: string): void {
    const demoAccounts: { [key: string]: { email: string; password: string } } = {
      'super-admin': { email: 'superadmin@urbanclean.com', password: 'Admin123!' },
      'admin': { email: 'admin@urbanclean.com', password: 'Admin123!' },
      'user': { email: 'user@urbanclean.com', password: 'User123!' },
      'collector': { email: 'collector@urbanclean.com', password: 'Collector123!' },
      'centre': { email: 'centre@urbanclean.com', password: 'Centre123!' }
    };

    const account = demoAccounts[role];
    if (account) {
      this.loginForm.patchValue({
        email: account.email,
        password: account.password
      });
    }
  }
}
