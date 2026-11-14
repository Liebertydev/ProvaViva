import AppError from '../errors/AppError.js';
import professorRepository from '../repositories/professorRepository.js';

class ProfessorService {
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
