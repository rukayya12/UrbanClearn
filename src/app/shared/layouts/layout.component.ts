import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    <div class="layout-container" [class.sidebar-collapsed]="isSidebarCollapsed">
      <app-sidebar [isCollapsed]="isSidebarCollapsed"></app-sidebar>
      <div class="layout-content">
        <header class="top-section">
          <button 
            type="button" 
            class="hamburger-btn" 
            (click)="toggleSidebar()" 
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            ☰
          </button>
        </header>
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
      background-color: #F0FDF4;
    }

    .layout-content {
      flex: 1;
      margin-left: 250px;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100vh;
      transition: margin-left 0.25s ease;
    }

    .sidebar-collapsed .layout-content {
      margin-left: 70px;
    }

    .top-section {
      height: 48px;
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      padding: 0 16px;
      flex-shrink: 0;
    }

    .hamburger-btn {
      background: transparent;
      border: none;
      font-size: 22px;
      line-height: 1;
      color: #15803D;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s, transform 0.1s;

      &:hover {
        background-color: #F0FDF4;
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .layout-main {
      flex: 1;
      padding: 30px;
      background-color: #F0FDF4;
      overflow-y: auto;

      @media (max-width: 768px) {
        padding: 20px;
      }
    }

    @media (max-width: 768px) {
      .layout-content {
        margin-left: 70px;
      }
    }
  `]
})
export class LayoutComponent {
  isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
