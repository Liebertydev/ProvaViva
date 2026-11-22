import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { gerarHashSenha, verificarSenha } from '../src/utils/senha.js';
import jwt from '../src/config/jwt.js';

const segredoAnterior = process.env.JWT_SECRET;
afterEach(() => {
  if (segredoAnterior === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = segredoAnterior;
});

test('hash de senha é diferente da senha e valida apenas a senha original', async () => {
  const hash = await gerarHashSenha('senha-segura-123');
  assert.notEqual(hash, 'senha-segura-123');
  assert.equal(await verificarSenha('senha-segura-123', hash), true);
  assert.equal(await verificarSenha('senha-errada-123', hash), false);
});

test('hash de senha usa salt diferente para cada criação', async () => {
  const primeiro = await gerarHashSenha('senha-segura-123');
  const segundo = await gerarHashSenha('senha-segura-123');
  assert.notEqual(primeiro, segundo);
});

test('JWT carrega o professor e expira após o prazo definido', async () => {
  process.env.JWT_SECRET = 'chave-local-de-teste-com-mais-de-32-bytes';
  const token = await jwt.gerarTokenProfessor('professor-uuid');
  const payload = await jwt.verificarToken(token);

  assert.deepEqual(payload, { professorId: 'professor-uuid', role: 'PROFESSOR' });
});

test('JWT exige segredo configurado com pelo menos 32 bytes', async () => {
  process.env.JWT_SECRET = 'curto';
  assert.throws(() => jwt.gerarTokenProfessor('professor-uuid'), /32 bytes/);
});
