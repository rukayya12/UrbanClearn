import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-collector-requests',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Assigned Requests</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class RequestsComponent {}
