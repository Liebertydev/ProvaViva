import { Router } from 'express';
import professorController from '../controllers/professorController.js';
import professorValidator from '../validators/professorValidator.js';
import autenticarProfessor, { autenticarOuCriarPrimeiroProfessor } from '../middlewares/autenticarProfessor.js';

const professorRoutes = Router();

professorRoutes.get('/', autenticarProfessor, professorController.listarProfessores);

professorRoutes.get(
  '/:id',
  autenticarProfessor,
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
