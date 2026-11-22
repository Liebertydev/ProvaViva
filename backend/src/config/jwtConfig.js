const duracaoTokenSegundos = 60 * 60;
const algoritmo = 'HS256';

const obterChaveJwt = () => {
  const segredo = process.env.JWT_SECRET;
  if (!segredo || Buffer.byteLength(segredo, 'utf8') < 32) {
    throw new Error('JWT_SECRET deve conter pelo menos 32 bytes.');
  }

  return new TextEncoder().encode(segredo);
};

export default { algoritmo, duracaoTokenSegundos, obterChaveJwt };
