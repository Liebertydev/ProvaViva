import AppError from '../errors/AppError.js';
import professorRepository from '../repositories/professorRepository.js';

class ProfessorService {
  async listarProfessores() {
    return professorRepository.listarTodos();
  }

  async buscarProfessorPorId(id) {
    const professor = await professorRepository.buscarPorId(id);

    if (!professor) {
      throw new AppError('Professor não encontrado.', 404);
    }

    return professor;
  }

  async criarProfessor(dados) {
    const professorExistente = await professorRepository.buscarPorMatricula(dados.matricula);

    if (professorExistente) {
      throw new AppError('Já existe um professor com esta matrícula.', 409);
    }

    // Falhas inesperadas seguem para o tratamento global de erros.
    return professorRepository.criar(dados);
  }
}

export default new ProfessorService();
