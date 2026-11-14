import alunoService from '../services/aluno.service.js';

const criarAluno = async (req, res, next) => {
  try {
    const { nome, matricula, turno } = req.body;
    const aluno = await alunoService.criarAluno({ nome, matricula, turno });

    return res.status(201).json(aluno);
  } catch (error) {
    next(error);
  }
};

export default { criarAluno };
