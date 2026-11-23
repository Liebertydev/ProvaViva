import { Router } from 'express';
import authController from '../controllers/authController.js';
import authValidator from '../validators/authValidator.js';

const authRoutes = Router();

authRoutes.post('/login', authValidator.validarLogin, authController.login);
authRoutes.post('/cadastro', authValidator.validarCadastro, authController.cadastrar);

export default authRoutes;
