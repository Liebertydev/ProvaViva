import type { Routes } from '@angular/router';

import { alunosRoutes } from './features/alunos/routes/alunos.routes';
import { folhasRoutes } from './features/folhas/routes/folhas.routes';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  ...folhasRoutes,
  ...alunosRoutes,
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  // Curinga: precisa ser a última rota; qualquer URL desconhecida volta para a Home.
  {
    path: '**',
    redirectTo: 'home',
  },
];
