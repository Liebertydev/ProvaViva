import professorService from '../services/professorService.js';

const listarProfessores = async (_req, res, next) => {
  try {
    const professores = await professorService.listarProfessores();
    return res.status(200).json(professores);
  } catch (error) {
    next(error);
  }
};

const buscarProfessorPorId = async (req, res, next) => {
  try {
    // O validator entrega o UUID validado, sem conversão para número.
    const professor = await professorService.buscarProfessorPorId(req.professorId);
    return res.status(200).json(professor);
  } catch (error) {
    next(error);
  }
};

const criarProfessor = async (req, res, next) => {
  try {
    const { nome, matricula, senha } = req.body;
    const professor = await professorService.criarProfessor({ nome, matricula, senha });
    return res.status(201).json(professor);
  } catch (error) {
    next(error);
  }
};

export default { listarProfessores, buscarProfessorPorId, criarProfessor };
