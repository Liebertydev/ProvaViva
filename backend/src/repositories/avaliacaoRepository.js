import prisma from '../database/prisma.js';

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

export default { criar };
