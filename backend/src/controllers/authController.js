import authService from '../services/authService.js';

const login = async (req, res, next) => {
  try {
    const resultado = await authService.login(req.body.matricula, req.body.senha);
    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export default { login };
