const validarCriarProfessor = (req, res, next) => {
  const dados = req.body;

  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return res.status(400).json({ mensagem: 'Informe nome e matrícula.' });
  }

  // ID, situação e datas são definidos pelo Prisma, não pelo cliente.
  const camposPermitidos = ['nome', 'matricula'];
  for (const campo of Object.keys(dados)) {
    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({ mensagem: 'Campos permitidos: nome, matrícula.' });
    }
  }

  const { nome, matricula } = dados;

  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ mensagem: 'Nome é obrigatório e deve ser uma string não vazia.' });
  }

  if (typeof matricula !== 'string' || !matricula.trim()) {
    return res.status(400).json({ mensagem: 'Matrícula é obrigatória e deve ser uma string não vazia.' });
  }

  req.body = { nome: nome.trim(), matricula: matricula.trim() };
  next();
};

export default { validarCriarProfessor };
