import type { Request, Response } from 'express';
import type { CriarAlunoDTO } from '../domain/aluno.dto.js';
import AlunoService from '../services/aluno.service.js';

const alunoService = new AlunoService();

const criarAluno = async (
  req: Request<Record<string, string>, unknown, CriarAlunoDTO>,
  res: Response,
) => {
  const { nome, matricula, turno } = req.body;
  const aluno = await alunoService.criarAluno({ nome, matricula, turno });

  return res.status(201).json(aluno);
};

export default { criarAluno };
