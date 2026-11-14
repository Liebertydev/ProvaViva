import { Router } from 'express';
import professorController from '../controllers/professorController.js';
import professorValidator from '../validators/professorValidator.js';

const professorRoutes = Router();

professorRoutes.get('/', professorController.listarProfessores);

professorRoutes.get(
  '/:id',
  professorValidator.validarIdProfessor,
  professorController.buscarProfessorPorId
);

professorRoutes.post(
  '/',
  professorValidator.validarCriarProfessor,
  professorController.criarProfessor
);

export default professorRoutes;
