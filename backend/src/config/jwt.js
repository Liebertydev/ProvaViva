import { SignJWT, jwtVerify } from 'jose';
import jwtConfig from './jwtConfig.js';

const gerarTokenProfessor = (professorId) => {
  return new SignJWT({ role: 'PROFESSOR' })
    .setProtectedHeader({ alg: jwtConfig.algoritmo })
    .setSubject(professorId)
    .setIssuedAt()
    .setExpirationTime(`${jwtConfig.duracaoTokenSegundos}s`)
    .sign(jwtConfig.obterChaveJwt());
};

const verificarToken = async (token) => {
  const { payload } = await jwtVerify(token, jwtConfig.obterChaveJwt(), {
    algorithms: [jwtConfig.algoritmo],
  });

  if (typeof payload.sub !== 'string' || payload.role !== 'PROFESSOR') {
    throw new Error('Token sem identidade de professor.');
  }

  return { professorId: payload.sub, role: 'PROFESSOR' };
};

export default { gerarTokenProfessor, verificarToken };
