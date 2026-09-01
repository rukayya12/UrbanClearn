import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-reports',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>My Reports</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class ReportsComponent {}
