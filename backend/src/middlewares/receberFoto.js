import multer from 'multer';
import AppError from '../errors/AppError.js';

const receberFoto = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const formatosPermitidos = ['image/jpeg', 'image/png'];

    if (!formatosPermitidos.includes(file.mimetype)) {
      return callback(new AppError('Envie uma imagem JPEG ou PNG.', 400));
    }

    callback(null, true);
  },
});

export default receberFoto;