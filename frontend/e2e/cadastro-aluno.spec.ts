import { expect, test, type Page, type Request } from '@playwright/test';

const API = 'http://localhost:3000/api';
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const DURACAO_TOKEN_SEGUNDOS = 3600;
const ID_ALUNO_CRIADO = 7;

interface RespostaSimulada {
  status: number;
  body: unknown;
}

/** Simula a API fora do ar (conexão recusada, status 0 no Angular). */
const FALHA_DE_REDE = 'falha-de-rede';

interface AlunoEnviado {
  nome: string;
  matricula: string;
  turno: string;
}

/** Simula a API: login, lista de avaliações (vazia) e o POST de alunos com a resposta dada. */
async function simularApi(
  page: Page,
  respostaAluno: (corpo: AlunoEnviado) => RespostaSimulada | typeof FALHA_DE_REDE | Promise<RespostaSimulada>,
): Promise<Request[]> {
  const postsAluno: Request[] = [];

  await page.route(`${API}/auth/login`, (rota) =>
    rota.fulfill({
      json: {
        token: 'token-de-teste',
        tipo: 'Bearer',
        expiraEm: DURACAO_TOKEN_SEGUNDOS,
        professor: { id: 'p1', nome: 'Professora Teste', email: 'prof@teste.local', matricula: '90000001' },
      },
    }),
  );
  await page.route(`${API}/avaliacoes`, (rota) => rota.fulfill({ json: [] }));
  await page.route(`${API}/alunos`, async (rota) => {
    postsAluno.push(rota.request());
    const resposta = await respostaAluno(rota.request().postDataJSON() as AlunoEnviado);
    if (resposta === FALHA_DE_REDE) return rota.abort('connectionrefused');
    const { status, body } = resposta;
    return rota.fulfill({ status, json: body });
  });

  return postsAluno;
}

/** Abre o cadastro, entra pelo login da câmera e volta ao formulário clicando. */
async function abrirCadastroAutenticado(page: Page): Promise<void> {
  await page.goto('/alunos/novo');
  await expect(page.getByText('Entre como professor para cadastrar alunos.')).toBeVisible();

  await page.getByRole('link', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/camera');

  await page.getByLabel('E-mail').fill('prof@teste.local');
  await page.getByLabel('Senha').fill('SenhaTeste123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Olá, Professora Teste')).toBeVisible();

  await page.locator('app-captura-folha ion-back-button').click();
  await expect(page).toHaveURL('/alunos/novo');
  // O aviso sai do DOM (@if) quando a página volta a aparecer com sessão.
  await expect(page.locator('app-form-aluno .aviso-sessao')).toHaveCount(0);
}

async function escolherTurno(page: Page, rotulo: string): Promise<void> {
  await page.locator('app-form-aluno ion-select[name="turno"]').click();
  const popover = page.locator('ion-popover');
  await expect(popover).toBeVisible();
  await popover.getByRole('radio', { name: rotulo }).click();
  // Espera o popover fechar: enquanto ele está na tela, prende o foco e intercepta cliques.
  await expect(popover).toHaveCount(0);
}

function formulario(page: Page) {
  // O Ionic cria uma cópia desabilitada do input em foco (.cloned-input); usamos só o original.
  const original = page.locator('input:not(.cloned-input)');
  const tela = page.locator('app-form-aluno');
  return {
    nome: tela.getByLabel('Nome completo').and(original),
    matricula: tela.getByLabel('Matrícula').and(original),
    enviar: page.locator('app-form-aluno').getByRole('button', { name: 'Cadastrar aluno' }),
  };
}

test.describe('Cadastro de aluno', () => {
  test('a rota /alunos/novo mostra o formulário com nome, matrícula e turno', async ({ page }) => {
    await page.goto('/alunos/novo');

    await expect(page.getByRole('heading', { name: 'Novo aluno' })).toBeVisible();
    await expect(formulario(page).nome).toBeVisible();
    await expect(formulario(page).matricula).toBeVisible();
    await expect(page.locator('app-form-aluno ion-select[name="turno"]')).toBeVisible();
  });

  test('não envia e mostra as validações com o formulário vazio ou inválido', async ({ page }) => {
    const posts = await simularApi(page, () => ({ status: HTTP_CREATED, body: {} }));
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.enviar.click();
    await expect(page.getByText('Informe o nome completo do aluno.')).toBeVisible();
    await expect(page.getByText('A matrícula deve ter exatamente 8 dígitos numéricos.')).toBeVisible();
    await expect(page.getByText('Selecione o turno do aluno.')).toBeVisible();

    await campos.nome.fill('   ');
    await campos.matricula.fill('1234a678');
    await campos.enviar.click();
    await expect(page.getByText('Informe o nome completo do aluno.')).toBeVisible();
    await expect(page.getByText('A matrícula deve ter exatamente 8 dígitos numéricos.')).toBeVisible();

    await campos.matricula.fill('1234567');
    await expect(page.getByText('A matrícula deve ter exatamente 8 dígitos numéricos.')).toBeVisible();

    expect(posts).toHaveLength(0);
  });

  test('envia a matrícula crua e mostra o aluno criado com a matrícula formatada', async ({ page }) => {
    const posts = await simularApi(page, (corpo) => ({
      status: HTTP_CREATED,
      body: { id: ID_ALUNO_CRIADO, ...corpo },
    }));
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('  Maria Silva  ');
    await campos.matricula.fill('12345678');
    await expect(page.getByText('Ficará registrada como 1234.5678')).toBeVisible();
    await escolherTurno(page, 'Manhã');
    await campos.enviar.click();

    const sucesso = page.getByRole('status').filter({ hasText: 'Aluno cadastrado' });
    await expect(sucesso).toContainText('Maria Silva');
    await expect(sucesso).toContainText('Matrícula 1234.5678');

    expect(posts).toHaveLength(1);
    expect(posts[0].postDataJSON()).toEqual({ nome: 'Maria Silva', matricula: '12345678', turno: 'MANHA' });
    expect(posts[0].headers()['authorization']).toBe('Bearer token-de-teste');

    await expect(campos.nome).toHaveValue('');
    await expect(campos.matricula).toHaveValue('');
    await expect(page.locator('app-form-aluno ion-select[name="turno"]')).toHaveJSProperty('value', '');
  });

  test('mostra o carregamento durante o envio e ignora o clique duplo', async ({ page }) => {
    let liberarResposta: () => void = () => undefined;
    const respostaLiberada = new Promise<void>((resolver) => {
      liberarResposta = resolver;
    });
    const posts = await simularApi(page, async (corpo) => {
      await respostaLiberada;
      return { status: HTTP_CREATED, body: { id: ID_ALUNO_CRIADO, ...corpo } };
    });
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.matricula.fill('12345678');
    await escolherTurno(page, 'Tarde');
    const primeiroPost = page.waitForRequest(`${API}/alunos`);
    await campos.enviar.click();
    await primeiroPost;

    const botaoEnviando = page.locator('app-form-aluno ion-button[type="submit"]');
    await expect(botaoEnviando).toContainText('Cadastrando...');
    await expect(botaoEnviando).toHaveAttribute('aria-disabled', 'true');
    await botaoEnviando.click({ force: true });
    await page.locator('app-form-aluno form').dispatchEvent('submit');
    expect(posts).toHaveLength(1);

    liberarResposta();
    await expect(page.getByRole('status').filter({ hasText: 'Aluno cadastrado' })).toContainText('Matrícula 1234.5678');
    await expect(botaoEnviando).toContainText('Cadastrar aluno');
    expect(posts).toHaveLength(1);
  });

  test('com sessão expirada (401) mostra o erro e volta a pedir login', async ({ page }) => {
    await simularApi(page, () => ({
      status: HTTP_UNAUTHORIZED,
      body: { mensagem: 'Sessão expirada.' },
    }));
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.matricula.fill('12345678');
    await escolherTurno(page, 'Manhã');
    await campos.enviar.click();

    await expect(page.getByRole('alert')).toHaveText('Sessão expirada.');
    const aviso = page.locator('app-form-aluno .aviso-sessao');
    await expect(aviso).toContainText('Entre como professor para cadastrar alunos.');
    await expect(aviso.getByRole('link', { name: 'Entrar' })).toBeVisible();
  });

  test('mostra a mensagem da API quando a matrícula já existe', async ({ page }) => {
    await simularApi(page, () => ({
      status: HTTP_CONFLICT,
      body: { mensagem: 'Já existe um aluno com esta matrícula.' },
    }));
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('Aluno Repetido');
    await campos.matricula.fill('20260001');
    await escolherTurno(page, 'Noite');
    await campos.enviar.click();

    await expect(page.getByRole('alert')).toHaveText('Já existe um aluno com esta matrícula.');
    await expect(page.getByText('Aluno cadastrado')).toBeHidden();
    await expect(campos.matricula).toHaveValue('20260001');
  });

  test('sem sessão, o envio mostra o erro e não chama a API', async ({ page }) => {
    const posts = await simularApi(page, () => ({ status: HTTP_CREATED, body: {} }));
    await page.goto('/alunos/novo');
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.matricula.fill('12345678');
    await escolherTurno(page, 'Tarde');
    await campos.enviar.click();

    await expect(page.getByRole('alert')).toHaveText('Entre com o e-mail e a senha do professor para continuar.');
    expect(posts).toHaveLength(0);
  });

  test('mostra a mensagem da API nos erros 400 e 500', async ({ page }) => {
    const respostas: RespostaSimulada[] = [
      { status: HTTP_BAD_REQUEST, body: { mensagem: 'Turno deve ser MANHA, TARDE ou NOITE.' } },
      { status: HTTP_SERVER_ERROR, body: { mensagem: 'Erro interno do servidor.' } },
    ];
    const posts = await simularApi(page, () => respostas[posts.length - 1]);
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.matricula.fill('12345678');
    await escolherTurno(page, 'Manhã');
    await campos.enviar.click();
    await expect(page.getByRole('alert')).toHaveText('Turno deve ser MANHA, TARDE ou NOITE.');

    await campos.enviar.click();
    await expect(page.getByRole('alert')).toHaveText('Erro interno do servidor.');
    expect(posts).toHaveLength(2);
  });

  test('sem conexão mostra o erro, e reenviar com a API de volta cadastra e limpa o erro', async ({ page }) => {
    let apiNoAr = false;
    await simularApi(page, (corpo) =>
      apiNoAr ? { status: HTTP_CREATED, body: { id: ID_ALUNO_CRIADO, ...corpo } } : FALHA_DE_REDE,
    );
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.matricula.fill('12345678');
    await escolherTurno(page, 'Noite');
    await campos.enviar.click();
    await expect(page.getByRole('alert')).toContainText('Não consegui conectar à API.');

    apiNoAr = true;
    await campos.enviar.click();
    await expect(page.getByRole('status').filter({ hasText: 'Aluno cadastrado' })).toContainText('Matrícula 1234.5678');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('dois cadastros seguidos atualizam o bloco de sucesso', async ({ page }) => {
    const posts = await simularApi(page, (corpo) => ({
      status: HTTP_CREATED,
      body: { id: ID_ALUNO_CRIADO, ...corpo },
    }));
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);
    const sucesso = page.getByRole('status').filter({ hasText: 'Aluno cadastrado' });

    await campos.nome.fill('Ana Primeira');
    await campos.matricula.fill('11112222');
    await escolherTurno(page, 'Manhã');
    await campos.enviar.click();
    await expect(sucesso).toContainText('Ana Primeira');
    await expect(sucesso).toContainText('Matrícula 1111.2222');

    await campos.nome.fill('Bruno Segundo');
    await campos.matricula.fill('33334444');
    await escolherTurno(page, 'Tarde');
    await campos.enviar.click();
    await expect(sucesso).toContainText('Bruno Segundo');
    await expect(sucesso).toContainText('Matrícula 3333.4444');
    await expect(sucesso).not.toContainText('Ana Primeira');
    expect(posts).toHaveLength(2);
  });

  test('sem turno, mostra só a mensagem de turno e não envia', async ({ page }) => {
    const posts = await simularApi(page, () => ({ status: HTTP_CREATED, body: {} }));
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.matricula.fill('12345678');
    await campos.enviar.click();

    await expect(page.getByText('Selecione o turno do aluno.')).toBeVisible();
    await expect(page.getByText('Informe o nome completo do aluno.')).toHaveCount(0);
    await expect(page.getByText('A matrícula deve ter exatamente 8 dígitos numéricos.')).toHaveCount(0);
    expect(posts).toHaveLength(0);
  });

  test('a matrícula digitada com 9 dígitos é cortada em 8', async ({ page }) => {
    await page.goto('/alunos/novo');
    const campos = formulario(page);

    await campos.matricula.pressSequentially('123456789');

    await expect(campos.matricula).toHaveValue('12345678');
    await expect(page.getByText('Ficará registrada como 1234.5678')).toBeVisible();
  });

  test('ao voltar logado, o erro de falta de sessão some', async ({ page }) => {
    const posts = await simularApi(page, () => ({ status: HTTP_CREATED, body: {} }));
    await page.goto('/alunos/novo');
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.matricula.fill('12345678');
    await escolherTurno(page, 'Manhã');
    await campos.enviar.click();
    await expect(page.getByRole('alert')).toHaveText('Entre com o e-mail e a senha do professor para continuar.');

    await page.getByRole('link', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/camera');
    await page.getByLabel('E-mail').fill('prof@teste.local');
    await page.getByLabel('Senha').fill('SenhaTeste123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Olá, Professora Teste')).toBeVisible();
    await page.locator('app-captura-folha ion-back-button').click();
    await expect(page).toHaveURL('/alunos/novo');

    await expect(page.locator('app-form-aluno .aviso-sessao')).toHaveCount(0);
    await expect(page.locator('app-form-aluno .mensagem-erro')).toHaveCount(0);
    expect(posts).toHaveLength(0);
  });

  test('ao voltar logado depois de um 401, a mensagem de sessão expirada some', async ({ page }) => {
    await simularApi(page, () => ({ status: HTTP_UNAUTHORIZED, body: { mensagem: 'Sessão expirada.' } }));
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.matricula.fill('12345678');
    await escolherTurno(page, 'Manhã');
    await campos.enviar.click();
    await expect(page.getByRole('alert')).toHaveText('Sessão expirada.');

    await page.locator('app-form-aluno .aviso-sessao').getByRole('link', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/camera');
    await page.getByLabel('E-mail').fill('prof@teste.local');
    await page.getByLabel('Senha').fill('SenhaTeste123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Olá, Professora Teste')).toBeVisible();
    await page.locator('app-captura-folha ion-back-button').click();
    await expect(page).toHaveURL('/alunos/novo');

    await expect(page.locator('app-form-aluno .aviso-sessao')).toHaveCount(0);
    await expect(page.locator('app-form-aluno .mensagem-erro')).toHaveCount(0);
  });

  test('Enter num campo envia o formulário (válido envia, inválido mostra as mensagens)', async ({ page }) => {
    const posts = await simularApi(page, (corpo) => ({
      status: HTTP_CREATED,
      body: { id: ID_ALUNO_CRIADO, ...corpo },
    }));
    await abrirCadastroAutenticado(page);
    const campos = formulario(page);

    await campos.nome.fill('Maria Silva');
    await campos.nome.press('Enter');
    await expect(page.getByText('A matrícula deve ter exatamente 8 dígitos numéricos.')).toBeVisible();
    expect(posts).toHaveLength(0);

    // Matrícula válida e Enter no Nome: o formulário inteiro está válido e envia.
    await campos.matricula.fill('87654321');
    await escolherTurno(page, 'Tarde');
    await campos.nome.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Aluno cadastrado' })).toContainText('Matrícula 8765.4321');
    expect(posts).toHaveLength(1);

    // Enter na Matrícula, com o formulário válido.
    await campos.nome.fill('Bruno Silva');
    await campos.matricula.fill('12345678');
    await escolherTurno(page, 'Manhã');
    await campos.matricula.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Aluno cadastrado' })).toContainText('Matrícula 1234.5678');
    expect(posts).toHaveLength(2);
  });

  test('os botões em foco pelo teclado ganham contorno visível', async ({ page }) => {
    await page.goto('/alunos/novo');
    // Contorno de 3px na cor do texto (--pv-ink #0d2a32) sobre o fundo claro (--pv-paper #f4faf8).
    const corDoContorno = 'rgb(13, 42, 50)';

    const entrar = page.locator('app-form-aluno .aviso-sessao ion-button');
    await page.locator('app-form-aluno .aviso-sessao p').click();
    await page.keyboard.press('Tab');
    await expect(entrar).toHaveCSS('outline-style', 'solid');
    await expect(entrar).toHaveCSS('outline-width', '3px');
    await expect(entrar).toHaveCSS('outline-color', corDoContorno);

    const cadastrar = page.locator('app-form-aluno ion-button[type="submit"]');
    await formulario(page).matricula.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(cadastrar).toHaveCSS('outline-style', 'solid');
    await expect(cadastrar).toHaveCSS('outline-width', '3px');
    await expect(cadastrar).toHaveCSS('outline-color', corDoContorno);
  });

  test('uma URL desconhecida leva para a Home sem erro no console', async ({ page }) => {
    const errosNoConsole: string[] = [];
    page.on('console', (mensagem) => {
      if (mensagem.type() === 'error') errosNoConsole.push(mensagem.text());
    });

    await page.goto('/alunos/xyz');

    await expect(page).toHaveURL('/home');
    await expect(page.locator('app-home')).toBeVisible();
    expect(errosNoConsole).toEqual([]);
  });
});
