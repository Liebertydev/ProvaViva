
import type { Request, Response, NextFunction } from 'express';
import AppError from './AppError.js';

export default function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      mensagem: error.message
    });
  }

  console.error(error);

  return res.status(500).json({
    mensagem: 'Erro interno do servidor.'
  });
}
