import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import app from '../src/app.js';
import alunoRepository from '../src/repositories/alunoRepository.js';

const idExistente = 42;
const aluno = {
  id: idExistente,
  nome: 'Aluno de teste',
  matricula: '00123456',
  turno: 'MANHA',
  ativo: true,
};

let server;
let baseUrl;
const buscarPorIdOriginal = alunoRepository.buscarPorId;
const buscarPorMatriculaOriginal = alunoRepository.buscarPorMatricula;
const criarOriginal = alunoRepository.criar;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  alunoRepository.buscarPorId = buscarPorIdOriginal;
  alunoRepository.buscarPorMatricula = buscarPorMatriculaOriginal;
  alunoRepository.criar = criarOriginal;

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

const enviar = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, body: await response.json() };
};

test('GET /api/alunos/:id retorna aluno existente com HTTP 200', async () => {
  alunoRepository.buscarPorId = async (id) => {
    assert.equal(id, idExistente);
    assert.equal(typeof id, 'number');
    return aluno;
  };

  const response = await enviar(`/api/alunos/${idExistente}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, aluno);
});

test('GET /api/alunos/:id retorna HTTP 404 quando o aluno nao existe', async () => {
  alunoRepository.buscarPorId = async () => null;

  const response = await enviar(`/api/alunos/${idExistente}`);

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { mensagem: 'Aluno não encontrado.' });
});

test('GET /api/alunos/:id retorna HTTP 400 sem consultar repository para ID invalido', async () => {
  let consultas = 0;
  alunoRepository.buscarPorId = async () => {
    consultas++;
    return null;
  };

  for (const id of ['id-invalido', '0', '1e3', '9007199254740992', '2147483648']) {
    const response = await enviar(`/api/alunos/${id}`);
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { mensagem: "Campo 'id' inválido." });
  }

  assert.equal(consultas, 0);
});

test('POST /api/alunos continua cadastrando sem acessar o banco no teste', async () => {
  alunoRepository.buscarPorMatricula = async () => null;
  alunoRepository.criar = async (dados) => ({ ...aluno, ...dados });

  const dados = { nome: 'Cadastro de teste', matricula: '00876543', turno: 'TARDE' };
  const response = await enviar('/api/alunos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.nome, dados.nome);
  assert.equal(response.body.matricula, dados.matricula);
  assert.equal(response.body.turno, dados.turno);
});
