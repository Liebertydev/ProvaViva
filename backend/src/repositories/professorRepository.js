import prisma from '../database/prisma.js';
import AppError from '../errors/AppError.js';

const buscarPorMatricula = (matricula) => {
  return prisma.professor.findUnique({ where: { matricula } });
};

const buscarPorId = (id) => {
  return prisma.professor.findUnique({ where: { id } });
};

const criar = async (dados) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Confere novamente a matrícula antes de criar, dentro da transação.
      const professorExistente = await tx.professor.findUnique({
        where: { matricula: dados.matricula },
      });

      if (professorExistente) {
        throw new AppError('Já existe um professor com esta matrícula.', 409);
      }

      return tx.professor.create({
        data: {
          nome: dados.nome,
          matricula: dados.matricula,
        },
      });
    });
  } catch (error) {
    // A restrição única protege também contra cadastros simultâneos.
    if (error.code === 'P2002') {
      throw new AppError('Já existe um professor com esta matrícula.', 409);
    }

    throw error;
  }
};

export default { buscarPorMatricula, buscarPorId, criar };
