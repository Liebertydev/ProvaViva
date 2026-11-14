import { Router } from 'express';
import professorController from '../controllers/professorController.js';
import professorValidator from '../validators/professorValidator.js';

const professorRoutes = Router();

professorRoutes.post(
  '/',
  professorValidator.validarCriarProfessor,
  professorController.criarProfessor
);

export default professorRoutes;
