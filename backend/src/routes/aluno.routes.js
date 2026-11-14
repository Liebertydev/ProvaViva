import { Router } from 'express';
import alunoController from '../controllers/aluno.controller.js';
import alunoValidator from '../validators/aluno.validator.js';

const alunoRoutes = Router();

alunoRoutes.post(
  '/',
  alunoValidator.validarCriarAluno,
  alunoController.criarAluno
);

export default alunoRoutes;
