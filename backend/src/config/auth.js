import 'dotenv/config';

const authConfig = {
  get jwtSecret() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
      throw new Error('JWT_SECRET deve conter pelo menos 32 bytes.');
    }

    return jwtSecret;
  },
};

export default authConfig;
