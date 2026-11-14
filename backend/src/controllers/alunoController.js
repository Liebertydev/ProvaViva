import alunoService from '../services/alunoService.js';

const buscarAlunoPorId = async (req, res, next) => {
  try {
    const aluno = await alunoService.buscarAlunoPorId(req.alunoId);
    return res.status(200).json(aluno);
  } catch (error) {
    next(error);
  }
};

const criarAluno = async (req, res, next) => {
  try {
    const { nome, matricula, turno } = req.body;
    const aluno = await alunoService.criarAluno({ nome, matricula, turno });

    return res.status(201).json(aluno);
  } catch (error) {
    next(error);
  }
};

export default { buscarAlunoPorId, criarAluno };
