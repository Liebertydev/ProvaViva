import type { Routes } from '@angular/router';
import { folhasRoutes } from './features/folhas/routes/folhas.routes';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  ...folhasRoutes,
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
