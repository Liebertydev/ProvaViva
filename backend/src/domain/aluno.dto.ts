import type { Turno } from '../generated/prisma/enums.js';

export type CriarAlunoDTO = {
  nome: string;
  matricula: string;
  turno: Turno;
};
