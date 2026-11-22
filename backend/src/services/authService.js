import AppError from '../errors/AppError.js';
import professorRepository from '../repositories/professorRepository.js';
import { verificarSenha } from '../utils/senha.js';
import jwt from '../config/jwt.js';
import jwtConfig from '../config/jwtConfig.js';

class AuthService {
  async login(matricula, senha) {
    const professor = await professorRepository.buscarCredenciaisPorMatricula(matricula);
    if (!professor || !professor.ativo || !professor.senhaHash) {
      throw new AppError('Matrícula ou senha inválidas.', 401);
    }

    const senhaValida = await verificarSenha(senha, professor.senhaHash);
    if (!senhaValida) throw new AppError('Matrícula ou senha inválidas.', 401);

    const token = await jwt.gerarTokenProfessor(professor.id);
    return {
      token,
      tipo: 'Bearer',
      expiraEm: jwtConfig.duracaoTokenSegundos,
      professor: {
        id: professor.id,
        nome: professor.nome,
        matricula: professor.matricula,
      },
    };
  }
}

export default new AuthService();
