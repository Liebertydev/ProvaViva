import type { RequestHandler } from 'express';
import AppError from '../errors/AppError.js';

const validarCriarAluno: RequestHandler = (req, _res, next) => {
  const dados: unknown = req.body;

  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return next(new AppError('Informe nome, matrícula e turno.', 400));
  }

  const camposPermitidos = ['nome', 'matricula', 'turno'];

  for (const campo of Object.keys(dados)) {
    if (!camposPermitidos.includes(campo)) {
      return next(new AppError('Campos permitidos: nome, matrícula e turno.', 400));
    }
  }

  const { nome, matricula, turno } = dados as Record<string, unknown>;

  if (typeof nome !== 'string' || !nome.trim()) {
    return next(new AppError('Nome é obrigatório e deve ser uma string não vazia.', 400));
  }

  if (typeof matricula !== 'string' || matricula.length !== 8 || !/^[0-9]{8}$/.test(matricula)) {
    return next(new AppError('Matrícula deve conter exatamente oito dígitos numéricos.', 400));
  }

  if (typeof turno !== 'string' || !['MANHA', 'TARDE', 'NOITE'].includes(turno)) {
    return next(new AppError('Turno deve ser MANHA, TARDE ou NOITE.', 400));
  }

  req.body = { nome: nome.trim(), matricula, turno };

  next();
};

export default { validarCriarAluno };
