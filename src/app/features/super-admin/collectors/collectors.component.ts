import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-collectors',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Collectors Management</h1></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class CollectorsComponent {}
