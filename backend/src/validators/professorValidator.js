import commonValidator from './commonValidator.js';

const validarCriarProfessor = (req, res, next) => {
  const dados = req.body;

  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return res.status(400).json({ mensagem: 'Informe nome, e-mail, matrícula e senha.' });
  }

  // ID, situação e datas são definidos pelo Prisma, não pelo cliente.
  const camposPermitidos = ['nome', 'email', 'matricula', 'senha'];
  for (const campo of Object.keys(dados)) {
    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({ mensagem: 'Campos permitidos: nome, e-mail, matrícula e senha.' });
    }
  }

  const { nome, email, matricula, senha } = dados;

  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ mensagem: 'Nome é obrigatório e deve ser uma string não vazia.' });
  }

  if (typeof matricula !== 'string' || !matricula.trim()) {
    return res.status(400).json({ mensagem: 'Matrícula é obrigatória e deve ser uma string não vazia.' });
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ mensagem: 'E-mail inválido.' });
  }

  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128) {
    return res.status(400).json({ mensagem: 'Senha deve ter entre 8 e 128 caracteres.' });
  }

  req.body = { nome: nome.trim(), email: email.trim().toLowerCase(), matricula: matricula.trim(), senha };
  next();
};

const validarIdProfessor = (req, res, next) => {
  const erroId = commonValidator.validarUuid(req.params.id);

  if (erroId) {
    return res.status(400).json({ mensagem: erroId });
  }

  req.professorId = req.params.id.toLowerCase();
  return next();
};

export default { validarCriarProfessor, validarIdProfessor };
