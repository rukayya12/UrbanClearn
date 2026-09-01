import { Routes } from '@angular/router';
import { AuthGuard, RoleGuard, SuperAdminGuard, AdminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/layouts/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'super-admin',
        canActivate: [SuperAdminGuard],
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/super-admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'users', loadComponent: () => import('./features/super-admin/users/users.component').then(m => m.UsersComponent) },
          { path: 'admins', loadComponent: () => import('./features/super-admin/admins/admins.component').then(m => m.AdminsComponent) },
          { path: 'collectors', loadComponent: () => import('./features/super-admin/collectors/collectors.component').then(m => m.CollectorsComponent) },
          { path: 'recycling-centres', loadComponent: () => import('./features/super-admin/recycling-centres/recycling-centres.component').then(m => m.RecyclingCentresComponent) },
          { path: 'requests', loadComponent: () => import('./features/super-admin/requests/requests.component').then(m => m.RequestsComponent) },
          { path: 'reports', loadComponent: () => import('./features/super-admin/reports/reports.component').then(m => m.ReportsComponent) },
          { path: 'map', loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent) },
          { path: 'analytics', loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent) },
          { path: 'settings', loadComponent: () => import('./features/super-admin/settings/settings.component').then(m => m.SettingsComponent) },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      {
        path: 'admin',
        canActivate: [AdminGuard],
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'users', loadComponent: () => import('./features/admin/users/users.component').then(m => m.UsersComponent) },
          { path: 'collectors', loadComponent: () => import('./features/admin/collectors/collectors.component').then(m => m.CollectorsComponent) },
          { path: 'recycling-centres', loadComponent: () => import('./features/admin/recycling-centres/recycling-centres.component').then(m => m.RecyclingCentresComponent) },
          { path: 'requests', loadComponent: () => import('./features/admin/requests/requests.component').then(m => m.RequestsComponent) },
          { path: 'reports', loadComponent: () => import('./features/admin/reports/reports.component').then(m => m.ReportsComponent) },
          { path: 'map', loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent) },
          { path: 'analytics', loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent) },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      {
        path: 'user',
        canActivate: [RoleGuard],
        data: { roles: ['normal-user'] },
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/user/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'request', loadComponent: () => import('./features/user/request-create/request-create.component').then(m => m.RequestCreateComponent) },
          { path: 'requests', loadComponent: () => import('./features/user/requests/requests.component').then(m => m.RequestsComponent) },
          { path: 'map', loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent) },
          { path: 'rewards', loadComponent: () => import('./features/rewards/rewards.component').then(m => m.RewardsComponent) },
          { path: 'reports', loadComponent: () => import('./features/user/reports/reports.component').then(m => m.ReportsComponent) },
          { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
          { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      {
        path: 'collector',
        canActivate: [RoleGuard],
        data: { roles: ['collector'] },
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/collector/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'requests', loadComponent: () => import('./features/collector/requests/requests.component').then(m => m.RequestsComponent) },
          { path: 'map', loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent) },
          { path: 'schedule', loadComponent: () => import('./features/collector/schedule/schedule.component').then(m => m.ScheduleComponent) },
          { path: 'history', loadComponent: () => import('./features/collector/history/history.component').then(m => m.HistoryComponent) },
          { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
          { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      {
        path: 'centre',
        canActivate: [RoleGuard],
        data: { roles: ['recycling-centre'] },
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/recycling-centre/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'requests', loadComponent: () => import('./features/recycling-centre/requests/requests.component').then(m => m.RequestsComponent) },
          { path: 'map', loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent) },
          { path: 'recycling', loadComponent: () => import('./features/recycling-centre/recycling/recycling.component').then(m => m.RecyclingComponent) },
          { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
          { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
