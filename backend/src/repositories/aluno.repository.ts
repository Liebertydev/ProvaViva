import prisma from '../database/prisma.js';
import type { CriarAlunoDTO } from '../domain/aluno.dto.js';

const buscarPorMatricula = (matricula: string) => {
  return prisma.aluno.findUnique({ where: { matricula } });
};

const criar = (dados: CriarAlunoDTO) => {
  return prisma.aluno.create({
    data: {
      nome: dados.nome,
      matricula: dados.matricula,
      turno: dados.turno,
    },
  });
};

export default { buscarPorMatricula, criar };
