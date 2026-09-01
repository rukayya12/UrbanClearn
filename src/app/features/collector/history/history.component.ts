import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Collection History</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class HistoryComponent {}
