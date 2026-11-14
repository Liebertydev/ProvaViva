import professorService from '../services/professorService.js';

const criarProfessor = async (req, res, next) => {
  try {
    const { nome, matricula } = req.body;
    const professor = await professorService.criarProfessor({ nome, matricula });
    return res.status(201).json(professor);
  } catch (error) {
    next(error);
  }
};

export default { criarProfessor };
