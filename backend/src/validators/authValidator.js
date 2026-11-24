const emailValido = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const validarLogin = (req, res, next) => {
  const dados = req.body;
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return res.status(400).json({ mensagem: 'Informe e-mail e senha.' });
  }

  const camposPermitidos = ['email', 'senha'];
  if (Object.keys(dados).some((campo) => !camposPermitidos.includes(campo))) {
    return res.status(400).json({ mensagem: 'Campos permitidos: e-mail e senha.' });
  }

  const { email, senha } = dados;
  if (!emailValido(email)) {
    return res.status(400).json({ mensagem: 'E-mail inválido.' });
  }
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128) {
    return res.status(400).json({ mensagem: 'Credenciais inválidas.' });
  }

  req.body = { email: email.trim().toLowerCase(), senha };
  return next();
};

const validarCadastro = (req, res, next) => {
  const dados = req.body;
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return res.status(400).json({ mensagem: 'Informe nome, e-mail, matrícula e senha.' });
  }

  const camposPermitidos = ['nome', 'email', 'matricula', 'senha'];
  if (Object.keys(dados).some((campo) => !camposPermitidos.includes(campo))) {
    return res.status(400).json({ mensagem: 'Campos permitidos: nome, e-mail, matrícula e senha.' });
  }

  const { nome, email, matricula, senha } = dados;
  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ mensagem: 'Nome é obrigatório.' });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ mensagem: 'E-mail inválido.' });
  }
  if (typeof matricula !== 'string' || !matricula.trim()) {
    return res.status(400).json({ mensagem: 'Matrícula é obrigatória.' });
  }
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128) {
    return res.status(400).json({ mensagem: 'Senha deve ter entre 8 e 128 caracteres.' });
  }

  req.body = {
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    matricula: matricula.trim(),
    senha,
  };
  return next();
};

export default { validarLogin, validarCadastro };
