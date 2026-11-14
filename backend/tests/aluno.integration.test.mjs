import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import app from '../dist/app.js';
import prisma from '../dist/database/prisma.js';
import alunoRepository from '../dist/repositories/aluno.repository.js';

// Executar após npm run build. Usa o banco configurado no backend/.env.
test('POST /api/alunos — integração com PostgreSQL', { timeout: 60_000 }, async (t) => {
  const marcador = `Teste cadastro ${randomUUID()}`;
  const matriculas = new Set();
  const matriculasEnviadas = new Set();
  let server;

  const reservarMatricula = async () => {
    for (let tentativa = 0; tentativa < 30; tentativa++) {
      const matricula = `0${String(randomInt(10_000_000)).padStart(7, '0')}`;
      if (!matriculas.has(matricula) && !await prisma.aluno.findUnique({ where: { matricula } })) {
        matriculas.add(matricula);
        return matricula;
      }
    }
    throw new Error('Não foi possível reservar uma matrícula livre para o teste.');
  };

  try {
    await prisma.$connect();
    const matricula = await reservarMatricula();
    const dados = { nome: `${marcador} válido`, matricula, turno: 'MANHA' };

    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const enviar = async (body) => {
      if (typeof body?.matricula === 'string') matriculasEnviadas.add(body.matricula);
      const response = await fetch(`${baseUrl}/api/alunos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };

    await t.test('cadastro válido retorna 201, preserva zeros e usa os defaults do Prisma', async () => {
      const response = await enviar({ ...dados, nome: `  ${dados.nome}  ` });
      assert.equal(response.status, 201);
      assert.equal(response.body.nome, dados.nome);
      assert.equal(response.body.matricula, matricula);
      assert.equal(response.body.turno, 'MANHA');
      assert.equal(response.body.ativo, true);
      assert.equal(response.body.desativadoEm, null);
      assert.equal(typeof response.body.id, 'string');
      assert(!Number.isNaN(Date.parse(response.body.createdAt)));
      assert(!Number.isNaN(Date.parse(response.body.updatedAt)));
      const persistido = await prisma.aluno.findUnique({ where: { matricula } });
      assert.equal(persistido.id, response.body.id);
      assert.equal(persistido.nome, dados.nome);
    });

    for (const turno of ['TARDE', 'NOITE']) {
      await t.test(`aceita o turno ${turno}`, async () => {
        const response = await enviar({ nome: `${marcador} ${turno}`, matricula: await reservarMatricula(), turno });
        assert.equal(response.status, 201);
        assert.equal(response.body.turno, turno);
      });
    }

    const invalidos = [
      ['nome ausente', { ...dados, nome: undefined }],
      ['nome vazio', { ...dados, nome: '' }],
      ['nome com somente espaços', { ...dados, nome: ' \t\n ' }],
      ['nome numérico', { ...dados, nome: 123 }],
      ['matrícula ausente', { ...dados, matricula: undefined }],
      ['matrícula curta', { ...dados, matricula: '1234567' }],
      ['matrícula longa', { ...dados, matricula: '123456789' }],
      ['matrícula com letras', { ...dados, matricula: '0012345A' }],
      ['matrícula numérica em vez de string', { ...dados, matricula: 12345678 }],
      ['matrícula com quebra de linha', { ...dados, matricula: `${matricula}\n` }],
      ['turno ausente', { ...dados, turno: undefined }],
      ['turno inválido', { ...dados, turno: 'INTEGRAL' }],
      ['turno em minúsculas', { ...dados, turno: 'manha' }],
      ['campo adicional', { ...dados, email: 'teste@example.invalid' }],
      ['ID fornecido pelo cliente', { ...dados, id: randomUUID() }],
      ['situação fornecida pelo cliente', { ...dados, ativo: false }],
      ['data fornecida pelo cliente', { ...dados, createdAt: new Date().toISOString() }],
      ['objeto vazio', {}],
      ['array', []],
      ['null', null],
      ['string em vez de objeto', 'aluno'],
    ];

    for (const [descricao, body] of invalidos) {
      await t.test(`${descricao} retorna 400 sem consultar o repository`, async () => {
        const buscarOriginal = alunoRepository.buscarPorMatricula;
        let consultas = 0;
        alunoRepository.buscarPorMatricula = async () => {
          consultas++;
          throw new Error('O validator não deveria permitir esta consulta.');
        };
        try {
          const response = await enviar(body);
          assert.equal(response.status, 400);
          assert.equal(typeof response.body.mensagem, 'string');
          assert.equal(consultas, 0);
        } finally {
          alunoRepository.buscarPorMatricula = buscarOriginal;
        }
      });
    }

    await t.test('JSON malformado retorna 400', async () => {
      const response = await fetch(`${baseUrl}/api/alunos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { mensagem: 'JSON inválido.' });
    });

    await t.test('matrícula já cadastrada retorna 409', async () => {
      const response = await enviar(dados);
      assert.equal(response.status, 409);
      assert.deepEqual(response.body, { mensagem: 'Já existe um aluno com esta matrícula.' });
    });

    await t.test('cadastros simultâneos tratam o P2002 real e retornam 201 e 409', async () => {
      const matriculaConcorrente = await reservarMatricula();
      const buscarOriginal = alunoRepository.buscarPorMatricula;
      const criarOriginal = alunoRepository.criar;
      let consultas = 0;
      let errosP2002 = 0;
      let liberar;
      const barreira = new Promise((resolve) => { liberar = resolve; });
      const timeout = setTimeout(() => liberar(), 5000);

      // Faz as duas consultas terminarem antes de liberar os inserts concorrentes.
      alunoRepository.buscarPorMatricula = async (valor) => {
        const aluno = await buscarOriginal(valor);
        if (valor === matriculaConcorrente) {
          consultas++;
          if (consultas === 2) liberar();
          await barreira;
        }
        return aluno;
      };
      alunoRepository.criar = async (body) => {
        try {
          return await criarOriginal(body);
        } catch (error) {
          if (error.code === 'P2002') errosP2002++;
          throw error;
        }
      };

      try {
        const respostas = await Promise.all([
          enviar({ nome: `${marcador} concorrente A`, matricula: matriculaConcorrente, turno: 'MANHA' }),
          enviar({ nome: `${marcador} concorrente B`, matricula: matriculaConcorrente, turno: 'MANHA' }),
        ]);
        assert.deepEqual(respostas.map((r) => r.status).sort(), [201, 409]);
        assert.equal(errosP2002, 1);
        assert.equal(await prisma.aluno.count({ where: { matricula: matriculaConcorrente } }), 1);
      } finally {
        liberar();
        clearTimeout(timeout);
        alunoRepository.buscarPorMatricula = buscarOriginal;
        alunoRepository.criar = criarOriginal;
      }
    });

    await t.test('erro inesperado retorna 500 sem expor detalhes internos', async () => {
      const criarOriginal = alunoRepository.criar;
      const logOriginal = console.error;
      let errosRegistrados = 0;
      alunoRepository.criar = async () => { throw new Error('Detalhe interno do teste.'); };
      console.error = () => { errosRegistrados++; };
      try {
        const response = await enviar({ ...dados, matricula: await reservarMatricula() });
        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { mensagem: 'Erro interno do servidor.' });
        assert.equal(errosRegistrados, 1);
      } finally {
        alunoRepository.criar = criarOriginal;
        console.error = logOriginal;
      }
    });

    await t.test('GET /health mantém o comportamento e listagem não é implementada', async () => {
      const health = await fetch(`${baseUrl}/health`);
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { status: 'ok', message: 'API ProvaViva funcionando!' });
      const listagem = await fetch(`${baseUrl}/api/alunos`);
      assert.equal(listagem.status, 404);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    try {
      // Só remove registros com a marca desta execução e matrículas enviadas por ela.
      if (matriculasEnviadas.size > 0) {
        const where = { nome: { contains: marcador }, matricula: { in: [...matriculasEnviadas] } };
        await prisma.aluno.deleteMany({ where });
        assert.equal(await prisma.aluno.count({ where }), 0);
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
