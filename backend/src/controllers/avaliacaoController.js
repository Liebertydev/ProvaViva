import avaliacaoService from '../services/avaliacaoService.js';

const criarAvaliacao = async (req, res, next) => {
  try {
    const { titulo, professorId, quantidadeQuestoes, gabarito } = req.body;
    const avaliacao = await avaliacaoService.criarAvaliacao({
      titulo,
      professorId,
      quantidadeQuestoes,
      gabarito,
    });

    return res.status(201).json(avaliacao);
  } catch (error) {
    next(error);
  }
};

const listarAvaliacoes = async (_req, res, next) => {
  try {
    const avaliacoes = await avaliacaoService.listarAvaliacoes();
    return res.status(200).json(avaliacoes);
  } catch (error) {
    next(error);
  }
};

export default { criarAvaliacao, listarAvaliacoes };
