import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, beforeEach, test } from 'node:test';
import express from 'express';
import app from '../src/app.js';
import prisma from '../src/database/prisma.js';
import errorHandler from '../src/errors/errorHandler.js';
import avaliacaoRoutes from '../src/routes/avaliacao.routes.js';

const professorId = 'f3d1c9a2-7b6e-4d31-a935-86e47f2cb290';
const dados = {
  titulo: 'Prova de Matemática',
  professorId,
  quantidadeQuestoes: 10,
  gabarito: ['A', 'C', 'B', 'D', 'E', 'A', 'B', 'C', 'D', 'A'],
};
const avaliacao = {
  id: '18a7152c-6410-4a97-bfcb-0c3b130e890f',
  ...dados,
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};
const originais = {
  buscarProfessor: prisma.professor.findUnique,
  criarAvaliacao: prisma.avaliacao.create,
};
let server;
let baseUrl;

before(async () => {
  // A rota é exercitada somente neste app de teste enquanto aguarda autorização.
  const appTeste = express();
  appTeste.use(express.json());
  appTeste.use('/api/avaliacoes', avaliacaoRoutes);
  appTeste.use(errorHandler);
  server = appTeste.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  // Os acessos ao Prisma são simulados; nenhum registro real é criado.
  prisma.professor.findUnique = async () => ({ id: professorId, ativo: true });
  prisma.avaliacao.create = async () => avaliacao;
});

after(async () => {
  prisma.professor.findUnique = originais.buscarProfessor;
  prisma.avaliacao.create = originais.criarAvaliacao;
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

const cadastrar = async (body) => {
  const response = await fetch(`${baseUrl}/api/avaliacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

test('cadastro válido retorna 201, associa o professor e preserva a ordem do gabarito', async () => {
  const ordem = [];
  prisma.professor.findUnique = async (args) => {
    assert.deepEqual(args, { where: { id: professorId } });
    ordem.push('buscar-professor');
    return { id: professorId, ativo: true };
  };
  prisma.avaliacao.create = async (args) => {
    assert.deepEqual(args, { data: {
      titulo: dados.titulo,
      quantidadeQuestoes: 10,
      gabarito: dados.gabarito,
      professor: { connect: { id: professorId } },
    } });
    ordem.push('criar-avaliacao');
    return avaliacao;
  };
  const response = await cadastrar({ ...dados, titulo: `  ${dados.titulo}  ` });
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, avaliacao);
  assert.deepEqual(response.body.gabarito, dados.gabarito);
  assert.deepEqual(ordem, ['buscar-professor', 'criar-avaliacao']);
});

test('professorId aceita UUID em maiúsculas e consulta o valor normalizado', async () => {
  prisma.professor.findUnique = async (args) => {
    assert.deepEqual(args, { where: { id: professorId } });
    return { id: professorId, ativo: true };
  };
  const response = await cadastrar({ ...dados, professorId: professorId.toUpperCase() });
  assert.equal(response.status, 201);
});

const invalidos = [
  ['título ausente', { ...dados, titulo: undefined }],
  ['título vazio', { ...dados, titulo: '' }],
  ['título com espaços', { ...dados, titulo: ' \t\n ' }],
  ['título numérico', { ...dados, titulo: 123 }],
  ['professorId ausente', { ...dados, professorId: undefined }],
  ['professorId vazio', { ...dados, professorId: '' }],
  ['professorId inválido', { ...dados, professorId: 'uuid-invalido' }],
  ['professorId numérico', { ...dados, professorId: 42 }],
  ['professorId com quebra de linha', { ...dados, professorId: `${professorId}\n` }],
  ['quantidade ausente', { ...dados, quantidadeQuestoes: undefined }],
  ['quantidade menor que 10', { ...dados, quantidadeQuestoes: 9 }],
  ['quantidade maior que 10', { ...dados, quantidadeQuestoes: 11 }],
  ['quantidade como string', { ...dados, quantidadeQuestoes: '10' }],
  ['gabarito ausente', { ...dados, gabarito: undefined }],
  ['gabarito null', { ...dados, gabarito: null }],
  ['gabarito como string', { ...dados, gabarito: 'ACBDEABCDA' }],
  ['gabarito vazio', { ...dados, gabarito: [] }],
  ['gabarito com menos de 10 respostas', { ...dados, gabarito: dados.gabarito.slice(1) }],
  ['gabarito com mais de 10 respostas', { ...dados, gabarito: [...dados.gabarito, 'A'] }],
  ['alternativa inválida', { ...dados, gabarito: ['F', ...dados.gabarito.slice(1)] }],
  ['alternativa em minúsculas', { ...dados, gabarito: ['a', ...dados.gabarito.slice(1)] }],
  ['alternativa numérica', { ...dados, gabarito: [1, ...dados.gabarito.slice(1)] }],
  ['alternativa null', { ...dados, gabarito: [null, ...dados.gabarito.slice(1)] }],
  ['resposta vazia', { ...dados, gabarito: ['', ...dados.gabarito.slice(1)] }],
  ['resposta com espaço', { ...dados, gabarito: [' ', ...dados.gabarito.slice(1)] }],
  ['alternativa com espaços', { ...dados, gabarito: [' A ', ...dados.gabarito.slice(1)] }],
  ['ID interno', { ...dados, id: avaliacao.id }],
  ['data interna', { ...dados, createdAt: avaliacao.createdAt }],
  ['relação interna', { ...dados, professor: { connect: { id: professorId } } }],
  ['enunciados adicionais', { ...dados, enunciados: ['Questão 1'] }],
  ['objeto vazio', {}],
  ['array', []],
  ['null', null],
];

for (const [descricao, body] of invalidos) {
  test(`${descricao} retorna 400 antes de consultar o banco`, async () => {
    let consultas = 0;
    prisma.professor.findUnique = async () => { consultas++; return null; };
    prisma.avaliacao.create = async () => { consultas++; return avaliacao; };
    const response = await cadastrar(body);
    assert.equal(response.status, 400);
    assert.equal(typeof response.body.mensagem, 'string');
    assert.equal(consultas, 0);
  });
}

test('professor inexistente retorna 404 e não cria avaliação', async () => {
  prisma.professor.findUnique = async () => null;
  let criacoes = 0;
  prisma.avaliacao.create = async () => { criacoes++; return avaliacao; };
  const response = await cadastrar(dados);
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { mensagem: 'Professor não encontrado.' });
  assert.equal(criacoes, 0);
});

test('professor inativo retorna 409 e não cria avaliação', async () => {
  prisma.professor.findUnique = async () => ({ id: professorId, ativo: false });
  let criacoes = 0;
  prisma.avaliacao.create = async () => { criacoes++; return avaliacao; };
  const response = await cadastrar(dados);
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { mensagem: 'Professor inativo não pode cadastrar avaliações.' });
  assert.equal(criacoes, 0);
});

for (const etapa of ['consulta', 'cadastro']) {
  test(`falha inesperada na ${etapa} retorna 500 sem expor detalhes`, async () => {
    const erro = new Error('Detalhe interno que não deve ir para a resposta.');
    const falhar = async () => { throw erro; };
    if (etapa === 'consulta') prisma.professor.findUnique = falhar;
    else prisma.avaliacao.create = falhar;
    const logOriginal = console.error;
    let erroRegistrado;
    console.error = (error) => { erroRegistrado = error; };
    try {
      const response = await cadastrar(dados);
      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { mensagem: 'Erro interno do servidor.' });
      assert.equal(erroRegistrado, erro);
    } finally {
      console.error = logOriginal;
    }
  });
}

test('PUT e DELETE continuam fora do router de avaliações', async () => {
  for (const [method, path] of [
    ['PUT', `/api/avaliacoes/${avaliacao.id}`], ['DELETE', `/api/avaliacoes/${avaliacao.id}`],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { method });
    assert.equal(response.status, 404);
  }
});

test('app real mantém health e não expõe a nova rota sem autorização', async () => {
  const realServer = app.listen(0, '127.0.0.1');
  await once(realServer, 'listening');
  const url = `http://127.0.0.1:${realServer.address().port}`;
  try {
    const health = await fetch(`${url}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', message: 'API ProvaViva funcionando!' });
    const response = await fetch(`${url}/api/avaliacoes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    });
    assert.equal(response.status, 404);
  } finally {
    await new Promise((resolve) => realServer.close(resolve));
  }
});
