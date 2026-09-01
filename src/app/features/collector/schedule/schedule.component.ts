import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Collection Schedule</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class ScheduleComponent {}
