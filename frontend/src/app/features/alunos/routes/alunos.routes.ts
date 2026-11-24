import type { Routes } from '@angular/router';

export const alunosRoutes: Routes = [
  {
    path: 'alunos/novo',
    loadComponent: async () => (await import('../pages/form-aluno/form-aluno.page')).FormAlunoPage,
  },
];
