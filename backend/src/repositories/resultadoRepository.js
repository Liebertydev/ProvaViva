import AppError from '../errors/AppError.js';

const criar = async (dados, tx) => {
  try {
    return await tx.resultado.create({
      data: {
        alunoId: dados.alunoId,
        avaliacaoId: dados.avaliacaoId,
        respostas: dados.respostas,
        acertos: dados.acertos,
        nota: dados.nota,
        status: dados.status,
      },
      select: {
        id: true,
        alunoId: true,
        avaliacaoId: true,
        respostas: true,
        acertos: true,
        nota: true,
        status: true,
        createdAt: true,
        aluno: { select: { nome: true, matricula: true } },
        avaliacao: { select: { titulo: true } },
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Este aluno já possui resultado para esta avaliação.', 409);
    }
    throw error;
  }
};

export default { criar };
