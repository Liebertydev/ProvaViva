import { Router } from 'express';
import alunoController from '../controllers/alunoController.js';
import alunoValidator from '../validators/alunoValidator.js';

const alunoRoutes = Router();

alunoRoutes.get(
  '/:id',
  alunoValidator.validarIdAluno,
  alunoController.buscarAlunoPorId
);

alunoRoutes.post(
  '/',
  alunoValidator.validarCriarAluno,
  alunoController.criarAluno
);

export default alunoRoutes;
