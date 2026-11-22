import { Router } from 'express';
import avaliacaoController from '../controllers/avaliacaoController.js';
import avaliacaoValidator from '../validators/avaliacaoValidator.js';

const avaliacaoRoutes = Router();

// O registro desta rota no app depende da decisão sobre a ausência de autenticação.
avaliacaoRoutes.get('/', avaliacaoController.listarAvaliacoes);
avaliacaoRoutes.post(
  '/',
  avaliacaoValidator.validarCriarAvaliacao,
  avaliacaoController.criarAvaliacao
);

export default avaliacaoRoutes;
