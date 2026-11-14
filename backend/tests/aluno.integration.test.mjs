import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import prisma from '../src/database/prisma.js';
import alunoRepository from '../src/repositories/alunoRepository.js';

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
      assert(Number.isSafeInteger(response.body.id));
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
        const criarOriginal = alunoRepository.criar;
        let consultas = 0;
        const consultaInesperada = async () => {
          consultas++;
          throw new Error('O validator não deveria permitir esta consulta.');
        };
        alunoRepository.buscarPorMatricula = consultaInesperada;
        alunoRepository.criar = consultaInesperada;
        try {
          const response = await enviar(body);
          assert.equal(response.status, 400);
          assert.equal(typeof response.body.mensagem, 'string');
          assert.equal(consultas, 0);
        } finally {
          alunoRepository.buscarPorMatricula = buscarOriginal;
          alunoRepository.criar = criarOriginal;
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

    await t.test('service consulta a matrícula e retorna 409 sem chamar a criação', async () => {
      const buscarOriginal = alunoRepository.buscarPorMatricula;
      const criarOriginal = alunoRepository.criar;
      let consultas = 0;
      let criacoes = 0;
      alunoRepository.buscarPorMatricula = async (valor) => {
        consultas++;
        assert.equal(valor, dados.matricula);
        return buscarOriginal(valor);
      };
      alunoRepository.criar = async () => {
        criacoes++;
        throw new Error('Não deve criar um aluno com matrícula já encontrada pelo service.');
      };
      try {
        const response = await enviar(dados);
        assert.equal(response.status, 409);
        assert.deepEqual(response.body, { mensagem: 'Já existe um aluno com esta matrícula.' });
        assert.equal(consultas, 1);
        assert.equal(criacoes, 0);
      } finally {
        alunoRepository.buscarPorMatricula = buscarOriginal;
        alunoRepository.criar = criarOriginal;
      }
    });

    await t.test('repository também verifica a matrícula dentro da transação', async () => {
      await assert.rejects(alunoRepository.criar(dados), (error) => {
        assert.equal(error.statusCode, 409);
        assert.equal(error.message, 'Já existe um aluno com esta matrícula.');
        return true;
      });
      assert.equal(await prisma.aluno.count({ where: { matricula: dados.matricula } }), 1);
    });

    await t.test('transações concorrentes retornam 201 e 409 e mantêm um único aluno', async () => {
      const matriculaConcorrente = await reservarMatricula();
      const transacaoOriginal = prisma.$transaction.bind(prisma);
      let transacoes = 0;
      let consultas = 0;
      const leiturasIniciais = [];
      const conflitos = [];
      let liberar;
      const barreira = new Promise((resolve) => { liberar = resolve; });
      const timeout = setTimeout(() => liberar(), 5000);

      // As duas transações leem a matrícula ainda livre antes de criar o aluno.
      prisma.$transaction = async (callback, options) => {
        transacoes++;
        try {
          return await transacaoOriginal(async (transacao) => {
            const buscarOriginal = transacao.aluno.findUnique;
            transacao.aluno.findUnique = async (args) => {
              const aluno = await buscarOriginal(args);
              if (args.where.matricula === matriculaConcorrente && consultas < 2) {
                consultas++;
                leiturasIniciais.push(aluno);
                if (consultas === 2) liberar();
                await barreira;
              }
              return aluno;
            };
            return callback(transacao);
          }, options);
        } catch (error) {
          if (error.code === 'P2002') conflitos.push(error.code);
          throw error;
        }
      };

      try {
        const respostas = await Promise.all([
          enviar({ nome: `${marcador} concorrente A`, matricula: matriculaConcorrente, turno: 'MANHA' }),
          enviar({ nome: `${marcador} concorrente B`, matricula: matriculaConcorrente, turno: 'MANHA' }),
        ]);
        assert.deepEqual(respostas.map((r) => r.status).sort(), [201, 409]);
        assert.deepEqual(leiturasIniciais, [null, null]);
        assert.equal(transacoes, 2);
        assert.deepEqual(conflitos, ['P2002']);
        assert.deepEqual(respostas.find((r) => r.status === 409).body, {
          mensagem: 'Já existe um aluno com esta matrícula.',
        });
        assert.equal(await prisma.aluno.count({ where: { matricula: matriculaConcorrente } }), 1);
      } finally {
        liberar();
        clearTimeout(timeout);
        prisma.$transaction = transacaoOriginal;
      }
    });

    await t.test('P2002 é traduzido pelo repository para HTTP 409', async () => {
      const transacaoOriginal = prisma.$transaction;
      prisma.$transaction = async () => {
        const error = new Error('Restrição de unicidade.');
        error.code = 'P2002';
        throw error;
      };
      try {
        const response = await enviar({ ...dados, matricula: await reservarMatricula() });
        assert.equal(response.status, 409);
        assert.deepEqual(response.body, { mensagem: 'Já existe um aluno com esta matrícula.' });
      } finally {
        prisma.$transaction = transacaoOriginal;
      }
    });

    await t.test('falha na transação retorna 500 genérico sem repetir a operação', async () => {
      const transacaoOriginal = prisma.$transaction;
      const logOriginal = console.error;
      let tentativas = 0;
      prisma.$transaction = async () => {
        tentativas++;
        const error = new Error('Conflito transacional.');
        error.code = 'P2034';
        throw error;
      };
      console.error = () => {};
      try {
        const response = await enviar({ ...dados, matricula: await reservarMatricula() });
        assert.equal(response.status, 500);
        assert.equal(tentativas, 1);
        assert.deepEqual(response.body, { mensagem: 'Erro interno do servidor.' });
      } finally {
        prisma.$transaction = transacaoOriginal;
        console.error = logOriginal;
      }
    });

    await t.test('falha antes do commit desfaz o cadastro inteiro', async () => {
      const matriculaRollback = await reservarMatricula();
      const transacaoOriginal = prisma.$transaction.bind(prisma);
      const logOriginal = console.error;
      prisma.$transaction = (callback, options) => {
        return transacaoOriginal(async (transacao) => {
          await callback(transacao);
          throw new Error('Falha simulada antes do commit.');
        }, options);
      };
      console.error = () => {};
      try {
        const response = await enviar({ ...dados, matricula: matriculaRollback });
        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { mensagem: 'Erro interno do servidor.' });
        assert.equal(await prisma.aluno.count({ where: { matricula: matriculaRollback } }), 0);
      } finally {
        prisma.$transaction = transacaoOriginal;
        console.error = logOriginal;
      }
    });

    await t.test('erro inesperado retorna 500 sem expor detalhes internos', async () => {
      const criarOriginal = alunoRepository.criar;
      const logOriginal = console.error;
      alunoRepository.criar = async () => { throw new Error('Detalhe interno do teste.'); };
      console.error = () => {};
      try {
        const response = await enviar({ ...dados, matricula: await reservarMatricula() });
        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { mensagem: 'Erro interno do servidor.' });
      } finally {
        alunoRepository.criar = criarOriginal;
        console.error = logOriginal;
      }
    });

    await t.test('GET /health mantém o comportamento e listagem retorna uma lista', async () => {
      const health = await fetch(`${baseUrl}/health`);
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { status: 'ok', message: 'API ProvaViva funcionando!' });
      const listagem = await fetch(`${baseUrl}/api/alunos`);
      assert.equal(listagem.status, 200);
      assert(Array.isArray(await listagem.json()));
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
