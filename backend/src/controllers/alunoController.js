import alunoService from "../services/alunoService.js";

const listarAlunos = async (_req, res, next) => {
  try {
    const alunos = await alunoService.listarAlunos();
    return res.status(200).json(alunos);
  } catch (error) {
    next(error);
  }
};

const buscarAlunoPorId = async (req, res, next) => {
  try {
    // O validator disponibiliza o ID numérico em req.alunoId.
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

export default { listarAlunos, buscarAlunoPorId, criarAluno };
