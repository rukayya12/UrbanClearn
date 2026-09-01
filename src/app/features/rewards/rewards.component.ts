import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Rewards</h1><p>Green points and rewards management</p></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class RewardsComponent {}
