import { Router } from 'express';
import fotoController from '../controllers/fotoController.js';
import receberFoto from '../middlewares/receberFoto.js';
import avaliacaoValidator from '../validators/avaliacaoValidator.js';

const fotoRoutes = Router();

fotoRoutes.post(
  '/avaliacoes/:id/corrigir',
  avaliacaoValidator.validarIdAvaliacao,
  receberFoto.single('imagem'),
  fotoController.corrigirFolha,
);

export default fotoRoutes;
