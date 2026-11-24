import prisma from '../database/prisma.js';
import AppError from '../errors/AppError.js';

const buscarPorMatricula = (matricula) => {
  return prisma.aluno.findUnique({
    where: {
      matricula,
    }
  });
};

const buscarPorId = (id) => {
  return prisma.aluno.findUnique({
    where: { id },
  });
};

const listarTodos = () => {
  // Inclui alunos inativos; a listagem não filtra pelo status.
  return prisma.aluno.findMany();
};

const criar = async (dados) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const alunoExistente = await tx.aluno.findUnique({
        where: {
          matricula: dados.matricula
        },
      });

      if (alunoExistente) {
        throw new AppError('Já existe um aluno com esta matrícula.', 409);
      }

      return tx.aluno.create({
        data: {
          nome: dados.nome,
          matricula: dados.matricula,
          turno: dados.turno,
        },
      });
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Já existe um aluno com esta matrícula.', 409);
    }

    throw error;
  }
};

export default { buscarPorMatricula, buscarPorId, listarTodos, criar };
