import prisma from '../database/prisma.js';
import AppError from '../errors/AppError.js';

const camposPublicos = {
  id: true,
  nome: true,
  matricula: true,
  ativo: true,
  desativadoEm: true,
  createdAt: true,
  updatedAt: true,
};

const buscarPorMatricula = (matricula) => {
  return prisma.professor.findUnique({ where: { matricula }, select: camposPublicos });
};

const buscarCredenciaisPorMatricula = (matricula) => {
  return prisma.professor.findUnique({
    where: { matricula },
    select: { ...camposPublicos, senhaHash: true },
  });
};

const buscarPorId = (id) => {
  return prisma.professor.findUnique({ where: { id }, select: camposPublicos });
};

const listarTodos = () => {
  // Segue a listagem de alunos: inclui registros ativos e inativos.
  return prisma.professor.findMany({ select: camposPublicos });
};

const contar = () => {
  return prisma.professor.count();
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
          senhaHash: dados.senhaHash,
        },
        select: camposPublicos,
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

export default {
  buscarPorMatricula,
  buscarCredenciaisPorMatricula,
  buscarPorId,
  listarTodos,
  contar,
  criar,
};
