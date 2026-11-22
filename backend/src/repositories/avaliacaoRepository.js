import prisma from '../database/prisma.js';
const listarTodos = () => {
  return prisma.avaliacao.findMany({
    select: {
      id: true,
      titulo: true,
      quantidadeQuestoes: true,
      professorId: true,
      professor: { select: { id: true, nome: true, matricula: true } },
      createdAt: true,
      updatedAt: true,
    },
  });
};


const buscarPorId = (id, conexao = prisma) => {
  return conexao.avaliacao.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      quantidadeQuestoes: true,
      professorId: true,
      professor: { select: { id: true, nome: true, matricula: true } },
      createdAt: true,
      updatedAt: true,
      gabarito: true,
    },
  });
};

const criar = (dados) => {
  return prisma.avaliacao.create({
    data: {
      titulo: dados.titulo,
      quantidadeQuestoes: dados.quantidadeQuestoes,
      gabarito: dados.gabarito,
      professor: { connect: { id: dados.professorId } },
    },
  });
};

export default { criar, listarTodos, buscarPorId };
