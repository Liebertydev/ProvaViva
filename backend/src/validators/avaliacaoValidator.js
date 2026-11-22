import commonValidator from './commonValidator.js';

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

  const camposPermitidos = ['titulo', 'professorId', 'quantidadeQuestoes', 'gabarito'];
  for (const campo of Object.keys(dados)) {
    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({
        mensagem: 'Campos permitidos: titulo, professorId, quantidadeQuestoes e gabarito.',
      });
    }
  }

  const { titulo, professorId, quantidadeQuestoes, gabarito } = dados;

  if (typeof titulo !== 'string' || !titulo.trim()) {
    return res.status(400).json({ mensagem: 'Título é obrigatório e deve ser uma string não vazia.' });
  }

  if (commonValidator.validarUuid(professorId)) {
    return res.status(400).json({ mensagem: 'professorId é obrigatório e deve ser um UUID válido.' });
  }

  if (quantidadeQuestoes !== 10) {
    return res.status(400).json({ mensagem: 'A avaliação deve ter exatamente 10 questões.' });
  }

  if (!Array.isArray(gabarito) || gabarito.length !== 10) {
    return res.status(400).json({ mensagem: 'Gabarito deve ser um array com exatamente 10 respostas.' });
  }

  // A ordem é preservada: a primeira posição corresponde à questão 1.
  for (const alternativa of gabarito) {
    if (typeof alternativa !== 'string' || !['A', 'B', 'C', 'D', 'E'].includes(alternativa)) {
      return res.status(400).json({ mensagem: 'Cada resposta do gabarito deve ser A, B, C, D ou E.' });
    }
  }

  req.body = { titulo: titulo.trim(), professorId: professorId.toLowerCase(), quantidadeQuestoes, gabarito };
  next();
};

export default { validarCriarAvaliacao, validarIdAvaliacao };
