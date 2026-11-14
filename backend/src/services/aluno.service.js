import AppError from '../errors/AppError.js';
import alunoRepository from '../repositories/aluno.repository.js';

class AlunoService {
  async criarAluno(dados) {
    try {
      const alunoExistente = await alunoRepository.buscarPorMatricula(dados.matricula);

      if (alunoExistente) {
        throw new AppError('Já existe um aluno com esta matrícula.', 409);
      }

      return await alunoRepository.criar(dados);
    } catch (error) {
      throw new AppError(
        error?.statusCode ? error.message : 'Erro interno do servidor.',
        error?.statusCode || 500,
      );
    }
  }
}

export default new AlunoService();
