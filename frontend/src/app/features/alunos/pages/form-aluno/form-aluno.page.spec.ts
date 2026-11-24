import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProvaVivaApiService } from '../../../../core/api/prova-viva-api.service';

import { FormAlunoPage } from './form-aluno.page';

describe('FormAlunoPage: erro ao voltar para a página', () => {
  let temSessao = false;

  function criarPagina(): FormAlunoPage {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ProvaVivaApiService, useValue: { temSessao: async () => temSessao } }],
    });
    return TestBed.createComponent(FormAlunoPage).componentInstance;
  }

  it('limpa o erro de falta de sessão quando o professor volta logado', async () => {
    const pagina = criarPagina();
    pagina.semSessao = true;
    pagina.erro = 'Entre com o e-mail e a senha do professor para continuar.';

    temSessao = true;
    await pagina.ionViewWillEnter();

    expect(pagina.semSessao).toBe(false);
    expect(pagina.erro).toBe('');
  });

  it('mantém um erro de outro tipo (ex.: matrícula duplicada) ao voltar já logado', async () => {
    const pagina = criarPagina();
    pagina.semSessao = false;
    pagina.erro = 'Já existe um aluno com esta matrícula.';

    temSessao = true;
    await pagina.ionViewWillEnter();

    expect(pagina.erro).toBe('Já existe um aluno com esta matrícula.');
  });

  it('mantém o erro de sessão se o professor volta ainda sem sessão', async () => {
    const pagina = criarPagina();
    pagina.semSessao = true;
    pagina.erro = 'Sessão expirada.';

    temSessao = false;
    await pagina.ionViewWillEnter();

    expect(pagina.semSessao).toBe(true);
    expect(pagina.erro).toBe('Sessão expirada.');
  });
});
