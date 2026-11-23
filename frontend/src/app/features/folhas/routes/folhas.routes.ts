import type { Routes } from '@angular/router';

export const folhasRoutes: Routes = [
  {
    path: 'camera',
    loadComponent: () =>
      import('../pages/captura-folha/captura-folha.page').then((modulo) => modulo.CapturaFolhaPage),
  },
  {
    path: 'folha',
    loadComponent: () =>
      import('../pages/modelo-folha/folha.page').then((modulo) => modulo.FolhaPage),
  },
];
