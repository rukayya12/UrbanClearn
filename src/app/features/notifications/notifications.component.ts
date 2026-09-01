import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Notifications</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class NotificationsComponent {}
