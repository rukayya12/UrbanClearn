import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>User Profile</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class ProfileComponent {}
