import authService from '../services/authService.js';

const login = async (req, res, next) => {
  try {
    const resultado = await authService.login(req.body.email, req.body.senha);
    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

const cadastrar = async (req, res, next) => {
  try {
    const professor = await authService.cadastrar(req.body);
    return res.status(201).json(professor);
  } catch (error) {
    next(error);
  }
};

export default { login, cadastrar };
