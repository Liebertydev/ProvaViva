import avaliacaoService from '../services/avaliacaoService.js';

const criarAvaliacao = async (req, res, next) => {
  try {
    const { titulo, quantidadeQuestoes, gabarito } = req.body;
    const avaliacao = await avaliacaoService.criarAvaliacao(req.professorId, {
      titulo,
      quantidadeQuestoes,
      gabarito,
    });

    return res.status(201).json(avaliacao);
  } catch (error) {
    next(error);
  }
};

const listarAvaliacoes = async (req, res, next) => {
  try {
    const avaliacoes = await avaliacaoService.listarAvaliacoes(req.professorId);
    return res.status(200).json(avaliacoes);
  } catch (error) {
    next(error);
  }
};

const buscarAvaliacaoPorId = async (req, res, next) => {
  try {
    const avaliacao = await avaliacaoService.buscarAvaliacaoPorId(req.avaliacaoId, req.professorId);
    return res.status(200).json(avaliacao);
  } catch (error) {
    next(error);
  }
};

const atualizarAvaliacao = async (req, res, next) => {
  try {
    const avaliacao = await avaliacaoService.atualizarAvaliacao(req.avaliacaoId, req.professorId, req.body);
    return res.status(200).json(avaliacao);
  } catch (error) {
    next(error);
  }
};

export default { criarAvaliacao, listarAvaliacoes, buscarAvaliacaoPorId, atualizarAvaliacao };
