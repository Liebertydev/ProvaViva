import type { CriarAlunoDTO } from '../domain/aluno.dto.js';
import AppError from '../errors/AppError.js';
import { Prisma } from '../generated/prisma/client.js';
import alunoRepository from '../repositories/aluno.repository.js';

export default class AlunoService {
  async criarAluno(dados: CriarAlunoDTO) {
    const alunoExistente = await alunoRepository.buscarPorMatricula(dados.matricula);

    if (alunoExistente) {
      throw new AppError('Já existe um aluno com esta matrícula.', 409);
    }

    try {
      return await alunoRepository.criar(dados);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('Já existe um aluno com esta matrícula.', 409);
      }

      throw error;
    }
  }
}
