const validarLogin = (req, res, next) => {
  const dados = req.body;
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return res.status(400).json({ mensagem: 'Informe matrícula e senha.' });
  }

  const camposPermitidos = ['matricula', 'senha'];
  if (Object.keys(dados).some((campo) => !camposPermitidos.includes(campo))) {
    return res.status(400).json({ mensagem: 'Campos permitidos: matrícula e senha.' });
  }

  const { matricula, senha } = dados;
  if (typeof matricula !== 'string' || !matricula.trim()) {
    return res.status(400).json({ mensagem: 'Matrícula é obrigatória.' });
  }
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128) {
    return res.status(400).json({ mensagem: 'Credenciais inválidas.' });
  }

  req.body = { matricula: matricula.trim(), senha };
  return next();
};

export default { validarLogin };
