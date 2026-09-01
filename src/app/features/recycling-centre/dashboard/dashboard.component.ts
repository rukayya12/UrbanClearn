import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recycling-centre-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="dashboard"><h1>Recycling Centre Dashboard</h1></div>`,
  styles: [`.dashboard { padding: 20px; }`]
})
export class DashboardComponent {}
