import AppError from '../errors/AppError.js';
import professorRepository from '../repositories/professorRepository.js';
import professorService from './professorService.js';
import { verificarSenha } from '../utils/senha.js';
import jwt from '../config/jwt.js';

class AuthService {
  async cadastrar(dados) {
    return professorService.criarProfessor(dados);
  }

  async login(email, senha) {
    const professor = await professorRepository.buscarCredenciaisPorEmail(email);
    if (!professor || !professor.ativo || !professor.senhaHash) {
      throw new AppError('E-mail ou senha inválidos.', 401);
    }

    const senhaValida = await verificarSenha(senha, professor.senhaHash);
    if (!senhaValida) throw new AppError('E-mail ou senha inválidos.', 401);

    const token = await jwt.gerarTokenProfessor(professor.id);
    return {
      token,
      tipo: 'Bearer',
      expiraEm: jwt.duracaoTokenSegundos,
      professor: {
        id: professor.id,
        nome: professor.nome,
        email: professor.email,
        matricula: professor.matricula,
      },
    };
  }
}

export default new AuthService();
