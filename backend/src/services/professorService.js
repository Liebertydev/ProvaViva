import AppError from '../errors/AppError.js';
import professorRepository from '../repositories/professorRepository.js';
import { gerarHashSenha } from '../utils/senha.js';

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
    const [professorPorMatricula, professorPorEmail] = await Promise.all([
      professorRepository.buscarPorMatricula(dados.matricula),
      dados.email ? professorRepository.buscarPorEmail(dados.email) : null,
    ]);

    if (professorPorMatricula || professorPorEmail) {
      throw new AppError('Já existe um professor com este e-mail ou matrícula.', 409);
    }

    // Falhas inesperadas seguem para o tratamento global de erros.
    const senhaHash = await gerarHashSenha(dados.senha);
    return professorRepository.criar({ ...dados, senhaHash });
  }
}

export default new ProfessorService();
