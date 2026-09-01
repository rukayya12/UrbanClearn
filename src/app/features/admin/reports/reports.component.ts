import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Reports Overview</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class ReportsComponent {}
