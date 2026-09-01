import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Analytics</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class AnalyticsComponent {}
