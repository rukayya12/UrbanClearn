import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>System Settings</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class SettingsComponent {}
