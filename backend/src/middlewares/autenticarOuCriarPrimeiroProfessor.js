import professorRepository from '../repositories/professorRepository.js';
import loginRequired from './loginRequired.js';

const autenticarOuCriarPrimeiroProfessor = async (req, res, next) => {
  try {
    if (await professorRepository.contar() === 0) return next();
    return loginRequired(req, res, next);
  } catch (error) {
    return next(error);
  }
};

export default autenticarOuCriarPrimeiroProfessor;
