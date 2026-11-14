import commonValidator from './commonValidator.js';

const validarCriarAluno = (req, res, next) => {
  const dados = req.body;

  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return res.status(400).json({ mensagem: 'Informe nome, matrícula e turno.' });
  }

  const camposPermitidos = ['nome', 'matricula', 'turno'];

  for (const campo of Object.keys(dados)) {
    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({ mensagem: 'Campos permitidos: nome, matrícula e turno.' });
    }
  }

  const { nome, matricula, turno } = dados;

  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ mensagem: 'Nome é obrigatório e deve ser uma string não vazia.' });
  }

  if (typeof matricula !== 'string' || matricula.length !== 8 || !/^[0-9]{8}$/.test(matricula)) {
    return res.status(400).json({ mensagem: 'Matrícula deve conter exatamente oito dígitos numéricos.' });
  }

  if (typeof turno !== 'string' || !['MANHA', 'TARDE', 'NOITE'].includes(turno)) {
    return res.status(400).json({ mensagem: 'Turno deve ser MANHA, TARDE ou NOITE.' });
  }

  req.body = { nome: nome.trim(), matricula, turno };

  next();
};

const validarIdAluno = (req, res, next) => {
  const erroId = commonValidator.validarId(req.params.id);

  if (erroId) {
    return res.status(400).json({ mensagem: erroId });
  }

  req.alunoId = Number(req.params.id);

  return next();
};

export default { validarCriarAluno, validarIdAluno };
