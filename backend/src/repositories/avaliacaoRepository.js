import prisma from '../database/prisma.js';

const camposResumo = {
  id: true,
  titulo: true,
  quantidadeQuestoes: true,
  professorId: true,
  professor: { select: { id: true, nome: true, matricula: true } },
  createdAt: true,
  updatedAt: true,
};

const camposDetalhe = { ...camposResumo, gabarito: true };

const listarTodos = (professorId) => {
  return prisma.avaliacao.findMany({ where: { professorId }, select: camposResumo });
};

const buscarPorId = (id, professorId, conexao = prisma) => {
  return conexao.avaliacao.findFirst({ where: { id, professorId }, select: camposDetalhe });
};

const executarTransacao = (operacao) => {
  return prisma.$transaction(operacao, { isolationLevel: 'ReadCommitted' });
};

const buscarPorIdParaAtualizar = async (id, tx) => {
  // Mantém a avaliação bloqueada até terminar a verificação e a atualização.
  const registros = await tx.$queryRaw`
    SELECT "id" FROM "Avaliacao" WHERE "id" = ${id} FOR UPDATE
  `;

  if (registros.length === 0) return null;

  return tx.avaliacao.findUnique({ where: { id }, select: camposDetalhe });
};

const buscarPorIdParaCorrigir = async (id, professorId, tx) => {
  const registros = await tx.$queryRaw`
    SELECT "id" FROM "Avaliacao" WHERE "id" = ${id} FOR UPDATE
  `;

  if (registros.length === 0) return null;

  const avaliacao = await tx.avaliacao.findUnique({ where: { id }, select: camposDetalhe });
  if (!avaliacao || avaliacao.professorId !== professorId) return null;
  return avaliacao;
};

const possuiResultados = async (avaliacaoId, tx) => {
  const resultado = await tx.resultado.findFirst({
    where: { avaliacaoId },
    select: { id: true },
  });

  return resultado !== null;
};

const atualizar = (id, dados, tx) => {
  return tx.avaliacao.update({ where: { id }, data: dados, select: camposDetalhe });
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

export default {
  criar,
  listarTodos,
  buscarPorId,
  executarTransacao,
  buscarPorIdParaAtualizar,
  buscarPorIdParaCorrigir,
  possuiResultados,
  atualizar,
};
