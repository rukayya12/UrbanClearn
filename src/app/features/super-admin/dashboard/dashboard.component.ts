import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <h1>Super Admin Dashboard</h1>
      <p>Welcome to the Super Admin Dashboard</p>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 20px;
    }
  `]
})
export class DashboardComponent {}
