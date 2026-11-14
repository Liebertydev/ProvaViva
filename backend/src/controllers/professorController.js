import professorService from '../services/professorService.js';

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
    const { nome, matricula } = req.body;
    const professor = await professorService.criarProfessor({ nome, matricula });
    return res.status(201).json(professor);
  } catch (error) {
    next(error);
  }
};

export default { buscarProfessorPorId, criarProfessor };
