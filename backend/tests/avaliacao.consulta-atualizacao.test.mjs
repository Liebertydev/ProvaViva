import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, beforeEach, test } from 'node:test';
import express from 'express';
import app from '../src/app.js';
import prisma from '../src/database/prisma.js';
import errorHandler from '../src/errors/errorHandler.js';
import avaliacaoRoutes from '../src/routes/avaliacao.routes.js';

const id = '18a7152c-6410-4a97-bfcb-0c3b130e890f';
const professor = { id: 'f3d1c9a2-7b6e-4d31-a935-86e47f2cb290', nome: 'Ana', matricula: '12345678' };
const resumo = {
  id, titulo: 'Matemática', quantidadeQuestoes: 10, professorId: professor.id, professor,
  createdAt: '2026-01-01T12:00:00.000Z', updatedAt: '2026-01-01T12:00:00.000Z',
};
const gabarito = ['A', 'C', 'B', 'D', 'E', 'A', 'B', 'C', 'D', 'A'];
const novoGabarito = ['E', ...gabarito.slice(1)];
const camposResumo = {
  id: true, titulo: true, quantidadeQuestoes: true, professorId: true,
  professor: { select: { id: true, nome: true, matricula: true } },
  createdAt: true, updatedAt: true,
};
const camposDetalhe = { ...camposResumo, gabarito: true };
const originais = {
  listar: prisma.avaliacao.findMany,
  buscar: prisma.avaliacao.findUnique,
  atualizar: prisma.avaliacao.update,
  resultado: prisma.resultado.findFirst,
  transacao: prisma.$transaction,
};
let server;
let baseUrl;
let tx;
let atual;
let temResultados;
let ordem;
let dadosGravados;

before(async () => {
  // O router é montado apenas no app isolado, sem expor o módulo no app real.
  const appTeste = express();
  appTeste.use(express.json());
  appTeste.use('/api/avaliacoes', avaliacaoRoutes);
  appTeste.use(errorHandler);
  server = appTeste.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api/avaliacoes`;
});

beforeEach(() => {
  atual = { ...resumo, gabarito: [...gabarito] };
  temResultados = false;
  ordem = [];
  dadosGravados = undefined;

  // Todas as consultas são simuladas. As operações do PATCH devem usar tx.
  prisma.avaliacao.findMany = async (args) => {
    ordem.push('listar');
    assert.deepEqual(args, { select: camposResumo });
    return [resumo];
  };
  prisma.avaliacao.findUnique = async (args) => {
    ordem.push('buscar');
    assert.deepEqual(args, { where: { id }, select: camposDetalhe });
    return atual;
  };
  prisma.avaliacao.update = async () => { assert.fail('Atualização fora da transação.'); };
  prisma.resultado.findFirst = async () => { assert.fail('Consulta de resultados fora da transação.'); };

  tx = {
    $queryRaw: async (strings, ...valores) => {
      ordem.push('bloquear');
      assert.ok(Array.isArray(strings.raw), 'SQL deve usar template parametrizado.');
      assert.match(strings.join('?'), /SELECT "id" FROM "Avaliacao" WHERE "id" = \? FOR UPDATE/);
      assert.deepEqual(valores, [id]);
      return atual ? [{ id }] : [];
    },
    avaliacao: {
      findUnique: async (args) => {
        ordem.push('ler-bloqueada');
        assert.deepEqual(args, { where: { id }, select: camposDetalhe });
        return atual;
      },
      update: async (args) => {
        ordem.push('atualizar');
        assert.equal(args.where.id, id);
        assert.deepEqual(args.select, camposDetalhe);
        dadosGravados = args.data;
        return { ...atual, ...args.data, updatedAt: '2026-02-01T12:00:00.000Z' };
      },
    },
    resultado: {
      findFirst: async (args) => {
        ordem.push('verificar-resultados');
        assert.deepEqual(args, { where: { avaliacaoId: id }, select: { id: true } });
        return temResultados ? { id: 'resultado-existente' } : null;
      },
    },
  };
  prisma.$transaction = async (operacao, opcoes) => {
    ordem.push('iniciar');
    assert.deepEqual(opcoes, { isolationLevel: 'ReadCommitted' });
    try {
      const resposta = await operacao(tx);
      ordem.push('concluir');
      return resposta;
    } catch (error) {
      ordem.push('abortar');
      throw error;
    }
  };
});

after(async () => {
  prisma.avaliacao.findMany = originais.listar;
  prisma.avaliacao.findUnique = originais.buscar;
  prisma.avaliacao.update = originais.atualizar;
  prisma.resultado.findFirst = originais.resultado;
  prisma.$transaction = originais.transacao;
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

const solicitar = async (metodo, path = '', dados) => {
  const resposta = await fetch(`${baseUrl}${path}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: dados === undefined ? undefined : JSON.stringify(dados),
  });
  return { status: resposta.status, body: await resposta.json() };
};

test('lista os dados básicos e o professor, sem gabarito nem resultados', async () => {
  const resposta = await solicitar('GET');
  assert.equal(resposta.status, 200);
  assert.deepEqual(resposta.body, [resumo]);
  assert.deepEqual(ordem, ['listar']);
});

test('listagem vazia retorna 200 com array vazio', async () => {
  prisma.avaliacao.findMany = async () => [];
  assert.deepEqual(await solicitar('GET'), { status: 200, body: [] });
});

test('busca por UUID inclui o gabarito e o professor', async () => {
  assert.deepEqual(await solicitar('GET', `/${id}`), { status: 200, body: atual });
  assert.deepEqual(ordem, ['buscar']);
});

test('UUID em maiúsculas é normalizado na busca e na atualização', async () => {
  assert.equal((await solicitar('GET', `/${id.toUpperCase()}`)).status, 200);
  assert.equal((await solicitar('PATCH', `/${id.toUpperCase()}`, { titulo: 'Outro título' })).status, 200);
});

test('busca inexistente retorna 404', async () => {
  atual = null;
  assert.deepEqual(await solicitar('GET', `/${id}`), {
    status: 404, body: { mensagem: 'Avaliação não encontrada.' },
  });
});

for (const metodo of ['GET', 'PATCH']) {
  for (const valor of ['123', 'uuid-invalido', `${id}%0A`]) {
    test(`${metodo} com ID inválido ${valor} retorna 400 sem consultar o banco`, async () => {
      const resposta = await solicitar(metodo, `/${valor}`, metodo === 'PATCH' ? { titulo: 'Teste' } : undefined);
      assert.equal(resposta.status, 400);
      assert.deepEqual(ordem, []);
    });
  }
}

for (const possuiResultados of [false, true]) {
  test(`atualiza somente o título com resultados=${possuiResultados}`, async () => {
    temResultados = possuiResultados;
    const resposta = await solicitar('PATCH', `/${id}`, { titulo: '  Novo título  ' });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.titulo, 'Novo título');
    assert.deepEqual(resposta.body.gabarito, gabarito);
    assert.deepEqual(dadosGravados, { titulo: 'Novo título' });
    assert.deepEqual(ordem, ['iniciar', 'bloquear', 'ler-bloqueada', 'atualizar', 'concluir']);
  });

  test(`gabarito idêntico não gera escrita com resultados=${possuiResultados}`, async () => {
    temResultados = possuiResultados;
    const resposta = await solicitar('PATCH', `/${id}`, { gabarito: [...gabarito] });
    assert.deepEqual(resposta, { status: 200, body: atual });
    assert.equal(dadosGravados, undefined);
    assert.deepEqual(ordem, ['iniciar', 'bloquear', 'ler-bloqueada', 'concluir']);
  });
}

test('gabarito idêntico permite alterar título mesmo com resultados', async () => {
  temResultados = true;
  const resposta = await solicitar('PATCH', `/${id}`, { titulo: 'Renomeada', gabarito: [...gabarito] });
  assert.equal(resposta.status, 200);
  assert.deepEqual(dadosGravados, { titulo: 'Renomeada' });
});

test('reenviar título e gabarito atuais não muda updatedAt', async () => {
  const resposta = await solicitar('PATCH', `/${id}`, { titulo: ` ${resumo.titulo} `, gabarito });
  assert.deepEqual(resposta.body, atual);
  assert.equal(resposta.status, 200);
  assert.equal(dadosGravados, undefined);
});

test('altera gabarito sem resultados dentro da mesma transação e preserva sua ordem', async () => {
  const resposta = await solicitar('PATCH', `/${id}`, { gabarito: novoGabarito });
  assert.equal(resposta.status, 200);
  assert.deepEqual(resposta.body.gabarito, novoGabarito);
  assert.deepEqual(dadosGravados, { gabarito: novoGabarito });
  assert.deepEqual(ordem, ['iniciar', 'bloquear', 'ler-bloqueada', 'verificar-resultados', 'atualizar', 'concluir']);
});

test('atualiza título e gabarito juntos quando não existem resultados', async () => {
  const resposta = await solicitar('PATCH', `/${id}`, { titulo: 'Revisada', gabarito: novoGabarito });
  assert.equal(resposta.status, 200);
  assert.deepEqual(dadosGravados, { titulo: 'Revisada', gabarito: novoGabarito });
});

test('bloqueia com 409 alteração real de gabarito com resultados, sem alterar título junto', async () => {
  temResultados = true;
  const resposta = await solicitar('PATCH', `/${id}`, { titulo: 'Outro título', gabarito: novoGabarito });
  assert.equal(resposta.status, 409);
  assert.match(resposta.body.mensagem, /já possui resultados/);
  assert.equal(dadosGravados, undefined);
  assert.deepEqual(ordem, ['iniciar', 'bloquear', 'ler-bloqueada', 'verificar-resultados', 'abortar']);
});

test('PATCH inexistente retorna 404 sem consultar resultados nem gravar', async () => {
  atual = null;
  assert.deepEqual(await solicitar('PATCH', `/${id}`, { titulo: 'Teste' }), {
    status: 404, body: { mensagem: 'Avaliação não encontrada.' },
  });
  assert.deepEqual(ordem, ['iniciar', 'bloquear', 'abortar']);
  assert.equal(dadosGravados, undefined);
});

const invalidos = [
  ['objeto vazio', {}], ['array', []], ['null', null],
  ['título vazio', { titulo: '' }], ['título com espaços', { titulo: ' \t\n ' }],
  ['título numérico', { titulo: 42 }], ['título null', { titulo: null }],
  ['gabarito null', { gabarito: null }], ['gabarito string', { gabarito: 'ACBDEABCDA' }],
  ['gabarito vazio', { gabarito: [] }],
  ['gabarito curto', { gabarito: gabarito.slice(1) }],
  ['gabarito longo', { gabarito: [...gabarito, 'A'] }],
];
for (const alternativa of ['F', 'a', '', ' ', ' A ', 1, null]) {
  invalidos.push([`alternativa ${JSON.stringify(alternativa)}`, { gabarito: [alternativa, ...gabarito.slice(1)] }]);
}
for (const campo of ['id', 'professorId', 'quantidadeQuestoes', 'createdAt', 'updatedAt', 'professor', 'resultados']) {
  invalidos.push([`campo interno ${campo}`, { titulo: 'Teste', [campo]: 'não permitido' }]);
}

for (const [descricao, dados] of invalidos) {
  test(`PATCH rejeita ${descricao} antes de acessar o banco`, async () => {
    const resposta = await solicitar('PATCH', `/${id}`, dados);
    assert.equal(resposta.status, 400);
    assert.equal(typeof resposta.body.mensagem, 'string');
    assert.deepEqual(ordem, []);
  });
}

test('PATCH sem corpo retorna 400 sem acesso ao banco', async () => {
  assert.equal((await solicitar('PATCH', `/${id}`)).status, 400);
  assert.deepEqual(ordem, []);
});

test('PATCH com JSON malformado retorna 400 sem acesso ao banco', async () => {
  const resposta = await fetch(`${baseUrl}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(resposta.status, 400);
  assert.deepEqual(await resposta.json(), { mensagem: 'JSON inválido.' });
  assert.deepEqual(ordem, []);
});

test('resultado que fica visível enquanto aguarda bloqueio impede mudança de gabarito', async () => {
  let sinalizarBloqueio;
  let liberarBloqueio;
  const bloqueioSolicitado = new Promise((resolve) => { sinalizarBloqueio = resolve; });
  const bloqueioLiberado = new Promise((resolve) => { liberarBloqueio = resolve; });
  const bloquear = tx.$queryRaw;
  tx.$queryRaw = async (...args) => {
    sinalizarBloqueio();
    await bloqueioLiberado;
    return bloquear(...args);
  };

  const pendente = solicitar('PATCH', `/${id}`, { gabarito: novoGabarito });
  await bloqueioSolicitado;
  temResultados = true;
  liberarBloqueio();
  assert.equal((await pendente).status, 409);
  assert.equal(dadosGravados, undefined);
});

for (const etapa of ['listagem', 'busca', 'bloqueio', 'resultados', 'atualização']) {
  test(`falha inesperada na ${etapa} retorna 500 sem detalhes internos`, async () => {
    const erro = new Error('Detalhe interno privado.');
    const falhar = async () => { throw erro; };
    if (etapa === 'listagem') prisma.avaliacao.findMany = falhar;
    if (etapa === 'busca') prisma.avaliacao.findUnique = falhar;
    if (etapa === 'bloqueio') tx.$queryRaw = falhar;
    if (etapa === 'resultados') tx.resultado.findFirst = falhar;
    if (etapa === 'atualização') tx.avaliacao.update = falhar;
    const logOriginal = console.error;
    let registrado;
    console.error = (error) => { registrado = error; };
    try {
      const resposta = etapa === 'listagem' ? await solicitar('GET') :
        etapa === 'busca' ? await solicitar('GET', `/${id}`) :
          await solicitar('PATCH', `/${id}`, { gabarito: novoGabarito });
      assert.deepEqual(resposta, { status: 500, body: { mensagem: 'Erro interno do servidor.' } });
      assert.equal(registrado, erro);
    } finally {
      console.error = logOriginal;
    }
  });
}

test('o app real continua sem expor GET e PATCH de avaliações até haver autenticação', async () => {
  const realServer = app.listen(0, '127.0.0.1');
  await once(realServer, 'listening');
  const url = `http://127.0.0.1:${realServer.address().port}/api/avaliacoes`;
  try {
    for (const [method, path] of [['GET', ''], ['GET', `/${id}`], ['PATCH', `/${id}`]]) {
      const resposta = await fetch(`${url}${path}`, { method });
      assert.equal(resposta.status, 404);
    }
    assert.deepEqual(ordem, []);
  } finally {
    await new Promise((resolve) => realServer.close(resolve));
  }
});
