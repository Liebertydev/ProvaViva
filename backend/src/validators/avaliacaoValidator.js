import commonValidator from './commonValidator.js';

const validarGabarito = (gabarito) => {
  if (!Array.isArray(gabarito) || gabarito.length !== 10) {
    return 'Gabarito deve ser um array com exatamente 10 respostas.';
  }

  // A ordem é preservada: a primeira posição corresponde à questão 1.
  for (const alternativa of gabarito) {
    if (typeof alternativa !== 'string' || !['A', 'B', 'C', 'D', 'E'].includes(alternativa)) {
      return 'Cada resposta do gabarito deve ser A, B, C, D ou E.';
    }
  }

  return null;
};

const validarIdAvaliacao = (req, res, next) => {
  const mensagem = commonValidator.validarUuid(req.params.id);
  if (mensagem) return res.status(400).json({ mensagem });

  req.avaliacaoId = req.params.id.toLowerCase();
  next();
};

const validarCriarAvaliacao = (req, res, next) => {
  const dados = req.body;

  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return res.status(400).json({ mensagem: 'Informe os dados da avaliação.' });
  }

  const camposPermitidos = ['titulo', 'quantidadeQuestoes', 'gabarito'];
  for (const campo of Object.keys(dados)) {
    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({
        mensagem: 'Campos permitidos: titulo, quantidadeQuestoes e gabarito.',
      });
    }
  }

  const { titulo, quantidadeQuestoes, gabarito } = dados;

  if (typeof titulo !== 'string' || !titulo.trim()) {
    return res.status(400).json({ mensagem: 'Título é obrigatório e deve ser uma string não vazia.' });
  }

  if (quantidadeQuestoes !== 10) {
    return res.status(400).json({ mensagem: 'A avaliação deve ter exatamente 10 questões.' });
  }

  const mensagem = validarGabarito(gabarito);
  if (mensagem) return res.status(400).json({ mensagem });

  req.body = { titulo: titulo.trim(), quantidadeQuestoes, gabarito };
  next();
};

const validarAtualizarAvaliacao = (req, res, next) => {
  const dados = req.body;

  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return res.status(400).json({ mensagem: 'Informe os dados da avaliação.' });
  }

  const camposPermitidos = ['titulo', 'gabarito'];
  const campos = Object.keys(dados);
  if (campos.length === 0) {
    return res.status(400).json({ mensagem: 'Informe titulo e/ou gabarito para atualizar.' });
  }

  for (const campo of campos) {
    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({ mensagem: 'Campos permitidos: titulo e gabarito.' });
    }
  }

  const alteracoes = {};
  if (campos.includes('titulo')) {
    if (typeof dados.titulo !== 'string' || !dados.titulo.trim()) {
      return res.status(400).json({ mensagem: 'Título deve ser uma string não vazia.' });
    }
    alteracoes.titulo = dados.titulo.trim();
  }

  if (campos.includes('gabarito')) {
    const mensagem = validarGabarito(dados.gabarito);
    if (mensagem) return res.status(400).json({ mensagem });
    alteracoes.gabarito = dados.gabarito;
  }

  req.body = alteracoes;
  next();
};

export default { validarCriarAvaliacao, validarIdAvaliacao, validarAtualizarAvaliacao };
