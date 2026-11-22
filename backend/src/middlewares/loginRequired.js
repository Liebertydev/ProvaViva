import jwt from '../config/jwt.js';

const loginRequired = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const [tipo, token, ...resto] = (authorization ?? '').split(' ');

  if (!authorization) {
    return res.status(401).json({ mensagem: 'Token não informado.' });
  }

  if (tipo !== 'Bearer' || !token || resto.length > 0) {
    return res.status(401).json({ mensagem: 'Formato de token inválido.' });
  }

  try {
    req.professorAutenticado = await jwt.verificarToken(token);
    req.professorId = req.professorAutenticado.professorId;
    return next();
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ mensagem: 'Sessão expirada.' });
    }

    return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }
};

export default loginRequired;
