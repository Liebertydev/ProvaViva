import AppError from '../errors/AppError.js';
import alunoRepository from '../repositories/alunoRepository.js';

class AlunoService {
  async buscarAlunoPorId(id) {
    const aluno = await alunoRepository.buscarPorId(id);

    if (!aluno) {
      throw new AppError('Aluno não encontrado.', 404);
    }

    return aluno;
  }

  async criarAluno(dados) {
    try {
      const alunoExistente = await alunoRepository.buscarPorMatricula(dados.matricula);

      if (alunoExistente) {
        throw new AppError('Já existe um aluno com esta matrícula.', 409);
      }

      return await alunoRepository.criar(dados);
    } catch (error) {
      throw new AppError(
        error?.message ? error.message : 'Erro interno do servidor.',
        error?.statusCode || 500,
      );
    }
  }
}

export default new AlunoService();