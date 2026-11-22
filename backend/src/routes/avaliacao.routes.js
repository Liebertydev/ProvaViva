import { Router } from 'express';
import avaliacaoController from '../controllers/avaliacaoController.js';
import avaliacaoValidator from '../validators/avaliacaoValidator.js';

const avaliacaoRoutes = Router();

// Estas rotas permanecem fora do app até existir autenticação e autorização reais.
avaliacaoRoutes.get('/', avaliacaoController.listarAvaliacoes);
avaliacaoRoutes.get(
  '/:id',
  avaliacaoValidator.validarIdAvaliacao,
  avaliacaoController.buscarAvaliacaoPorId
);
avaliacaoRoutes.patch(
  '/:id',
  avaliacaoValidator.validarIdAvaliacao,
  avaliacaoValidator.validarAtualizarAvaliacao,
  avaliacaoController.atualizarAvaliacao
);

avaliacaoRoutes.post(
  '/',
  avaliacaoValidator.validarCriarAvaliacao,
  avaliacaoController.criarAvaliacao
);

export default avaliacaoRoutes;
