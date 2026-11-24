import { SignJWT, jwtVerify } from 'jose';
import authConfig from './auth.js';

const duracaoTokenSegundos = 60 * 60;
const algoritmo = 'HS256';
const obterChave = () => new TextEncoder().encode(authConfig.jwtSecret);

const gerarTokenProfessor = (professorId) => {
  return new SignJWT({ role: 'PROFESSOR' })
    .setProtectedHeader({ alg: algoritmo })
    .setSubject(professorId)
    .setIssuedAt()
    .setExpirationTime(`${duracaoTokenSegundos}s`)
    .sign(obterChave());
};

const verificarToken = async (token) => {
  const { payload } = await jwtVerify(token, obterChave(), {
    algorithms: [algoritmo],
  });

  if (typeof payload.sub !== 'string' || payload.role !== 'PROFESSOR') {
    throw new Error('Token sem identidade de professor.');
  }

  return { professorId: payload.sub, role: 'PROFESSOR' };
};

export default { gerarTokenProfessor, verificarToken, duracaoTokenSegundos };
