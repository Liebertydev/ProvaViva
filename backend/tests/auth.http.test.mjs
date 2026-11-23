import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, beforeEach, test } from 'node:test';
import app from '../src/app.js';
import prisma from '../src/database/prisma.js';
import { gerarHashSenha } from '../src/utils/senha.js';

const senha = 'senha-professor-123';
const professor = {
  id: 'f3d1c9a2-7b6e-4d31-a935-86e47f2cb290',
  nome: 'Professora Teste',
  email: 'professora@example.com',
  matricula: 'PROF-001',
  ativo: true,
  senhaHash: await gerarHashSenha(senha),
};
const originais = {
  buscarProfessor: prisma.professor.findUnique,
  listarAlunos: prisma.aluno.findMany,
  transacao: prisma.$transaction,
};
let server;
let baseUrl;

before(async () => {
  process.env.JWT_SECRET = 'segredo-de-teste-com-pelo-menos-trinta-e-dois-bytes';
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  prisma.professor.findUnique = async () => professor;
  prisma.aluno.findMany = async () => [];
  prisma.$transaction = async (callback) => callback({ professor: {
    findFirst: async () => null,
    create: async ({ data }) => {
      const { senhaHash: _senhaHash, ...dadosPublicos } = data;
      const { senhaHash: _hashAnterior, ...professorPublico } = professor;
      return { ...professorPublico, ...dadosPublicos };
    },
  } });
});

after(async () => {
  prisma.professor.findUnique = originais.buscarProfessor;
  prisma.aluno.findMany = originais.listarAlunos;
  prisma.$transaction = originais.transacao;
  if (server) await new Promise((resolve) => server.close(resolve));
});

const login = async (body) => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

test('login por e-mail retorna JWT e dados públicos do professor', async () => {
  const response = await login({ email: professor.email, senha });
  assert.equal(response.status, 200);
  assert.equal(response.body.tipo, 'Bearer');
  assert.equal(typeof response.body.token, 'string');
  assert.deepEqual(response.body.professor, {
    id: professor.id,
    nome: professor.nome,
    email: professor.email,
    matricula: professor.matricula,
  });
  assert.equal(JSON.stringify(response.body).includes('senhaHash'), false);
});

test('login rejeita senha incorreta com resposta genérica', async () => {
  assert.deepEqual(await login({ email: professor.email, senha: 'senha-incorreta-123' }), {
    status: 401,
    body: { mensagem: 'E-mail ou senha inválidos.' },
  });
});

test('cadastro cria conta de professor e nunca devolve o hash da senha', async () => {
  prisma.professor.findUnique = async () => null;
  const response = await fetch(`${baseUrl}/api/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: professor.nome,
      email: ' NOVO@EXAMPLE.COM ',
      matricula: 'PROF-002',
      senha,
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.email, 'novo@example.com');
  assert.equal(JSON.stringify(body).includes('senhaHash'), false);
});

test('rotas de alunos exigem bearer token e aceitam um JWT de professor', async () => {
  const semToken = await fetch(`${baseUrl}/api/alunos`);
  assert.equal(semToken.status, 401);

  const autenticacao = await login({ email: professor.email, senha });
  const resposta = await fetch(`${baseUrl}/api/alunos`, {
    headers: { Authorization: `Bearer ${autenticacao.body.token}` },
  });
  assert.equal(resposta.status, 200);
  assert.deepEqual(await resposta.json(), []);
});
