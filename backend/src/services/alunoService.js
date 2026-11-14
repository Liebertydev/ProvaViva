import AppError from '../errors/AppError.js';
import alunoRepository from '../repositories/alunoRepository.js';

class AlunoService {
  async listarAlunos() {
    return alunoRepository.listarTodos();
  }

  async buscarAlunoPorId(id) {
    const aluno = await alunoRepository.buscarPorId(id);

    if (!aluno) {
      throw new AppError('Aluno não encontrado.', 404);
    }

    return aluno;
  }

  async criarAluno(dados) {
    const alunoExistente = await alunoRepository.buscarPorMatricula(dados.matricula);

    if (alunoExistente) {
      throw new AppError('Já existe um aluno com esta matrícula.', 409);
    }

    // Erros inesperados seguem para o errorHandler global.
    return alunoRepository.criar(dados);
  }
}

export default new AlunoService();