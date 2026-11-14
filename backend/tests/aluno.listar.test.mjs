import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import app from '../src/app.js';
import alunoRepository from '../src/repositories/alunoRepository.js';

let server;
let baseUrl;
const listarTodosOriginal = alunoRepository.listarTodos;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  alunoRepository.listarTodos = listarTodosOriginal;

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

const buscarAlunos = async () => {
  const response = await fetch(`${baseUrl}/api/alunos`);
  return { status: response.status, body: await response.json() };
};

test('GET /api/alunos retorna todos os alunos, incluindo inativos', async () => {
  const alunos = [
    { id: 1, nome: 'Aluna ativa', ativo: true },
    { id: 2, nome: 'Aluno inativo', ativo: false },
  ];
  alunoRepository.listarTodos = async () => alunos;

  const response = await buscarAlunos();

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, alunos);
});

test('GET /api/alunos retorna lista vazia quando nao ha alunos', async () => {
  alunoRepository.listarTodos = async () => [];

  const response = await buscarAlunos();

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});
