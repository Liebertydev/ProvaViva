import correcaoFolhaService from '../services/correcaoFolhaService.js';

const corrigirFolha = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ mensagem: 'Envie a foto no campo imagem.' });
    }

    const correcao = await correcaoFolhaService.corrigir({
      imagem: req.file.buffer,
      avaliacaoId: req.avaliacaoId,
      professorId: req.professorId,
    });

    return res.status(201).json(correcao);
  } catch (error) {
    return next(error);
  }
};

export default { corrigirFolha };
