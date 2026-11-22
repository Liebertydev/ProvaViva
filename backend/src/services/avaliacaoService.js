import AppError from '../errors/AppError.js';
import professorRepository from '../repositories/professorRepository.js';
import avaliacaoRepository from '../repositories/avaliacaoRepository.js';

class AvaliacaoService {
  async listarAvaliacoes() {
    return avaliacaoRepository.listarTodos();
  }

  async buscarAvaliacaoPorId(id) {
    const avaliacao = await avaliacaoRepository.buscarPorId(id);

    if (!avaliacao) {
      throw new AppError('Avaliação não encontrada.', 404);
    }

    return avaliacao;
  }

  async criarAvaliacao(dados) {
    const professor = await professorRepository.buscarPorId(dados.professorId);

    if (!professor) {
      throw new AppError('Professor não encontrado.', 404);
    }

    if (!professor.ativo) {
      throw new AppError('Professor inativo não pode cadastrar avaliações.', 409);
    }

    return avaliacaoRepository.criar(dados);
  }
}

export default new AvaliacaoService();
