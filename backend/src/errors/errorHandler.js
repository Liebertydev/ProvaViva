
import AppError from './AppError.js';

export default function errorHandler(
  error,
  req,
  res,
  next
) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ mensagem: 'A imagem excede o limite de 10 MB.' });
  }

  if (typeof error.code === 'string' && error.code.startsWith('LIMIT_')) {
    return res.status(400).json({ mensagem: 'O envio deve conter apenas uma imagem no campo imagem.' });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      mensagem: error.message
    });
  }

  if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    return res.status(400).json({
      mensagem: 'JSON inválido.'
    });
  }

  console.error(error);

  return res.status(500).json({
    mensagem: 'Erro interno do servidor.'
  });
}
