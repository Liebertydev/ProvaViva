import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const custo = 32768;
const blocos = 8;
const paralelismo = 1;
const tamanhoHash = 64;

export const gerarHashSenha = async (senha) => {
  const salt = randomBytes(16);
  const hash = await scrypt(senha, salt, tamanhoHash, {
    N: custo,
    r: blocos,
    p: paralelismo,
    maxmem: 64 * 1024 * 1024,
  });

  return `scrypt$${custo}$${blocos}$${paralelismo}$${salt.toString('base64')}$${hash.toString('base64')}`;
};

export const verificarSenha = async (senha, registroHash) => {
  const partes = registroHash?.split('$');
  if (!partes || partes.length !== 6 || partes[0] !== 'scrypt') return false;

  const [, n, r, p, saltBase64, hashBase64] = partes;
  if (Number(n) !== custo || Number(r) !== blocos || Number(p) !== paralelismo) return false;
  const salt = Buffer.from(saltBase64, 'base64');
  const hashEsperado = Buffer.from(hashBase64, 'base64');
  if (salt.length !== 16 || hashEsperado.length !== tamanhoHash) return false;

  const hashRecebido = await scrypt(senha, salt, tamanhoHash, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });

  return timingSafeEqual(hashEsperado, hashRecebido);
};
