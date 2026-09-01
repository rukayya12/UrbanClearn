import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { NavbarComponent } from './navbar/navbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent],
  template: `
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <div class="layout-content">
        <app-navbar></app-navbar>
        <main class="layout-main">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex;
      min-height: 100vh;
    }

    .layout-content {
      flex: 1;
      margin-left: 250px;
      display: flex;
      flex-direction: column;

      @media (max-width: 768px) {
        margin-left: 70px;
      }
    }

    .layout-main {
      flex: 1;
      padding: 30px;
      background-color: #f5f6fa;
      overflow-y: auto;

      @media (max-width: 768px) {
        padding: 20px;
      }
    }
  `]
})
export class LayoutComponent {}
