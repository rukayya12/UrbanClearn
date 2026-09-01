import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page"><h1>Map View</h1><p>Interactive map component placeholder</p></div>`,
  styles: [`.page { padding: 20px; }`]
})
export class MapComponent {}
