import { Router } from 'express';
import professorController from '../controllers/professorController.js';
import professorValidator from '../validators/professorValidator.js';
import loginRequired from '../middlewares/loginRequired.js';
import autenticarOuCriarPrimeiroProfessor from '../middlewares/autenticarOuCriarPrimeiroProfessor.js';

const professorRoutes = Router();

professorRoutes.get('/', loginRequired, professorController.listarProfessores);

professorRoutes.get(
  '/:id',
  loginRequired,
  professorValidator.validarIdProfessor,
  professorController.buscarProfessorPorId
);

professorRoutes.post(
  '/',
  professorValidator.validarCriarProfessor,
  autenticarOuCriarPrimeiroProfessor,
  professorController.criarProfessor
);

export default professorRoutes;
