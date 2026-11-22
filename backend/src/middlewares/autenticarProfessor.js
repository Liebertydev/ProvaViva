import professorRepository from '../repositories/professorRepository.js';
import jwt from '../config/jwt.js';

const autenticarProfessor = async (req, res, next) => {
  const autorizacao = req.get('authorization');
  const correspondencia = /^Bearer\s+(.+)$/i.exec(autorizacao ?? '');
  if (!correspondencia) {
    return res.status(401).json({ mensagem: 'Autenticação necessária.' });
  }

  try {
    req.professorAutenticado = await jwt.verificarToken(correspondencia[1]);
    req.professorId = req.professorAutenticado.professorId;
    return next();
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ mensagem: 'Sessão expirada.' });
    }
    return res.status(401).json({ mensagem: 'Token inválido.' });
  }
};

const autenticarOuCriarPrimeiroProfessor = async (req, res, next) => {
  try {
    if (await professorRepository.contar() === 0) return next();
    return autenticarProfessor(req, res, next);
  } catch (error) {
    return next(error);
  }
};

export { autenticarOuCriarPrimeiroProfessor };
export default autenticarProfessor;
