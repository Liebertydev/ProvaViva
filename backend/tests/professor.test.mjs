import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, beforeEach, test } from 'node:test';
import app from '../src/app.js';
import prisma from '../src/database/prisma.js';
import jwt from '../src/config/jwt.js';

const id = 'f3d1c9a2-7b6e-4d31-a935-86e47f2cb290';
const professor = {
  id,
  nome: 'Professor de teste',
  email: 'professor@example.com',
  matricula: 'PROF-001',
  ativo: true,
  desativadoEm: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};
const dados = { nome: professor.nome, email: professor.email, matricula: professor.matricula, senha: 'senha-prof-123' };
const camposPublicos = {
  id: true, nome: true, email: true, matricula: true, ativo: true, desativadoEm: true,
  createdAt: true, updatedAt: true,
};
const originais = {
  findUnique: prisma.professor.findUnique,
  findMany: prisma.professor.findMany,
  create: prisma.professor.create,
  transaction: prisma.$transaction,
  count: prisma.professor.count,
};
let server;
let baseUrl;
let token;

before(async () => {
  process.env.JWT_SECRET = 'segredo-de-teste-com-pelo-menos-trinta-e-dois-bytes';
  token = await jwt.gerarTokenProfessor(id);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  // Todos os acessos usados pelas rotas são simulados; não há escrita no banco real.
  prisma.professor.findUnique = async () => null;
  prisma.professor.findMany = async () => [];
  prisma.professor.count = async () => 0;
  prisma.professor.create = async () => {
    throw new Error('O cadastro deve usar a transação.');
  };
  prisma.$transaction = async (callback) => callback({
    professor: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async ({ data }) => ({ ...professor, ...data }),
    },
  });
});

after(async () => {
  prisma.professor.findUnique = originais.findUnique;
  prisma.professor.findMany = originais.findMany;
  prisma.professor.create = originais.create;
  prisma.professor.count = originais.count;
  prisma.$transaction = originais.transaction;
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

const enviar = async (path, options) => {
  const headers = { ...(options?.headers ?? {}) };
  if (path !== '/api/auth/login') headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
};

const cadastrar = (body) => enviar('/api/professores', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('POST cadastra com 201, normaliza dados e armazena hash da senha', async () => {
  const ordem = [];
  prisma.professor.findUnique = async (args) => {
    if (args.where.matricula) {
      assert.deepEqual(args, { where: { matricula: dados.matricula }, select: camposPublicos });
      ordem.push('consulta-service-matricula');
    } else {
      assert.deepEqual(args, { where: { email: dados.email }, select: camposPublicos });
      ordem.push('consulta-service-email');
    }
    return null;
  };
  prisma.$transaction = async (callback) => {
    ordem.push('transacao');
    return callback({ professor: {
      findFirst: async (args) => {
        assert.deepEqual(args, { where: { OR: [{ matricula: dados.matricula }, { email: dados.email }] } });
        ordem.push('consulta-transacao');
        return null;
      },
      create: async (args) => {
        assert.deepEqual(args.select, {
          id: true, nome: true, email: true, matricula: true, ativo: true, desativadoEm: true,
          createdAt: true, updatedAt: true,
        });
        assert.equal(args.data.nome, dados.nome);
        assert.equal(args.data.email, dados.email);
        assert.equal(args.data.matricula, dados.matricula);
        assert.notEqual(args.data.senhaHash, dados.senha);
        ordem.push('criar');
        return professor;
      },
    } });
  };

  const response = await cadastrar({
    nome: `  ${dados.nome}  `,
    email: ` ${dados.email.toUpperCase()} `,
    matricula: ` ${dados.matricula} `,
    senha: dados.senha,
  });
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, professor);
  assert.deepEqual(ordem, [
    'consulta-service-matricula', 'consulta-service-email', 'transacao', 'consulta-transacao', 'criar',
  ]);
});

test('POST preserva os zeros iniciais da matrícula', async () => {
  const response = await cadastrar({ ...dados, matricula: '00123456' });
  assert.equal(response.status, 201);
  assert.equal(response.body.matricula, '00123456');
});

const cadastrosInvalidos = [
  ['nome ausente', { matricula: dados.matricula }],
  ['nome vazio', { ...dados, nome: '' }],
  ['nome com espaços', { ...dados, nome: ' \t\n ' }],
  ['nome numérico', { ...dados, nome: 123 }],
  ['nome null', { ...dados, nome: null }],
  ['matrícula ausente', { nome: dados.nome }],
  ['matrícula vazia', { ...dados, matricula: '' }],
  ['matrícula com espaços', { ...dados, matricula: ' \t ' }],
  ['matrícula numérica', { ...dados, matricula: 123 }],
  ['matrícula null', { ...dados, matricula: null }],
  ['ID fornecido pelo cliente', { ...dados, id }],
  ['situação fornecida pelo cliente', { ...dados, ativo: false }],
  ['data fornecida pelo cliente', { ...dados, createdAt: professor.createdAt }],
  ['turno adicional', { ...dados, turno: 'MANHA' }],
  ['e-mail ausente', { nome: dados.nome, matricula: dados.matricula, senha: dados.senha }],
  ['e-mail inválido', { ...dados, email: 'email-inválido' }],
  ['campo adicional', { ...dados, adicional: true }],
  ['objeto vazio', {}],
  ['array', []],
  ['null', null],
  ['string', 'professor'],
];

for (const [descricao, body] of cadastrosInvalidos) {
  test(`POST rejeita ${descricao} com 400 antes de consultar o banco`, async () => {
    let consultas = 0;
    prisma.professor.findUnique = async () => { consultas++; return null; };
    prisma.$transaction = async () => { consultas++; return professor; };
    const response = await cadastrar(body);
    assert.equal(response.status, 400);
    assert.equal(typeof response.body.mensagem, 'string');
    assert.equal(consultas, 0);
  });
}

test('POST rejeita JSON malformado com 400', async () => {
  const response = await enviar('/api/professores', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { mensagem: 'JSON inválido.' });
});

test('POST retorna 409 no service se a matrícula já existir, inclusive para inativo', async () => {
  prisma.professor.findUnique = async () => ({ ...professor, ativo: false });
  let transacoes = 0;
  prisma.$transaction = async () => { transacoes++; return professor; };
  const response = await cadastrar(dados);
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { mensagem: 'Já existe um professor com este e-mail ou matrícula.' });
  assert.equal(transacoes, 0);
});

test('POST retorna 409 se a matrícula aparecer dentro da transação', async () => {
  let criacoes = 0;
  prisma.$transaction = async (callback) => callback({ professor: {
    findFirst: async () => professor,
    create: async () => { criacoes++; return professor; },
  } });
  const response = await cadastrar(dados);
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { mensagem: 'Já existe um professor com este e-mail ou matrícula.' });
  assert.equal(criacoes, 0);
});

test('POST converte P2002 em 409 sem repetir a transação', async () => {
  let transacoes = 0;
  prisma.$transaction = async () => {
    transacoes++;
    const error = new Error('Unicidade simulada.');
    error.code = 'P2002';
    throw error;
  };
  const response = await cadastrar(dados);
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { mensagem: 'Já existe um professor com este e-mail ou matrícula.' });
  assert.equal(transacoes, 1);
});

test('GET por ID consulta o UUID como string e retorna 200', async () => {
  prisma.professor.findUnique = async (args) => {
    assert.deepEqual(args, { where: { id }, select: camposPublicos });
    return professor;
  };
  const response = await enviar(`/api/professores/${id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, professor);
});

test('GET por ID normaliza letras maiúsculas do UUID', async () => {
  prisma.professor.findUnique = async (args) => {
    assert.deepEqual(args, { where: { id }, select: camposPublicos });
    return professor;
  };
  const response = await enviar(`/api/professores/${id.toUpperCase()}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.id, id);
});

test('GET por ID retorna 404 se o professor não existir', async () => {
  const response = await enviar(`/api/professores/${id}`);
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { mensagem: 'Professor não encontrado.' });
});

test('GET por ID rejeita formatos inválidos com 400 antes de consultar o banco', async () => {
  let consultas = 0;
  prisma.professor.findUnique = async () => { consultas++; return null; };
  for (const valor of ['42', '0', 'invalido', id.slice(1), `${id}0`, `${id}\n`, ` ${id}`, id.replace('f', 'g')]) {
    const response = await enviar(`/api/professores/${encodeURIComponent(valor)}`);
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { mensagem: "Campo 'id' inválido." });
  }
  assert.equal(consultas, 0);
});

test('GET lista todos os professores, incluindo inativos, com 200', async () => {
  const professores = [professor, { ...professor, id: '91cce207-65a7-4439-8b7e-c241eaef1009', ativo: false }];
  prisma.professor.findMany = async (...args) => {
    assert.deepEqual(args, [{ select: camposPublicos }]);
    return professores;
  };
  const response = await enviar('/api/professores');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, professores);
});

test('GET lista vazia retorna 200 e array vazio', async () => {
  const response = await enviar('/api/professores');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});

for (const operacao of ['cadastro', 'busca', 'listagem']) {
  test(`falha inesperada na ${operacao} chega ao handler e retorna 500 sem detalhes`, async () => {
    const erro = new Error('Detalhe interno que não deve ir para a resposta.');
    const falhar = async () => { throw erro; };
    if (operacao === 'cadastro') prisma.$transaction = falhar;
    if (operacao === 'busca') prisma.professor.findUnique = falhar;
    if (operacao === 'listagem') prisma.professor.findMany = falhar;
    const logOriginal = console.error;
    let erroRegistrado;
    console.error = (error) => { erroRegistrado = error; };
    try {
      const response = operacao === 'cadastro'
        ? await cadastrar(dados)
        : await enviar(operacao === 'busca' ? `/api/professores/${id}` : '/api/professores');
      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { mensagem: 'Erro interno do servidor.' });
      assert.equal(erroRegistrado, erro);
    } finally {
      console.error = logOriginal;
    }
  });
}

test('rotas de atualização e exclusão não são implementadas', async () => {
  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    const response = await fetch(`${baseUrl}/api/professores/${id}`, { method });
    assert.equal(response.status, 404);
  }
});
