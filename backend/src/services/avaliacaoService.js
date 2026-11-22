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

  async atualizarAvaliacao(id, dados) {
    return avaliacaoRepository.executarTransacao(async (tx) => {
      const avaliacao = await avaliacaoRepository.buscarPorIdParaAtualizar(id, tx);

      if (!avaliacao) {
        throw new AppError('Avaliação não encontrada.', 404);
      }

      const alteracoes = {};
      if (dados.titulo !== undefined && dados.titulo !== avaliacao.titulo) {
        alteracoes.titulo = dados.titulo;
      }

      const mudouGabarito = dados.gabarito !== undefined && (
        dados.gabarito.length !== avaliacao.gabarito.length ||
        dados.gabarito.some((alternativa, indice) => alternativa !== avaliacao.gabarito[indice])
      );

      if (mudouGabarito) {
        const temResultados = await avaliacaoRepository.possuiResultados(id, tx);

        if (temResultados) {
          throw new AppError('O gabarito não pode ser alterado porque a avaliação já possui resultados.', 409);
        }

        alteracoes.gabarito = dados.gabarito;
      }

      // Reenviar os mesmos valores não altera nem o gabarito nem updatedAt.
      if (Object.keys(alteracoes).length === 0) return avaliacao;

      return avaliacaoRepository.atualizar(id, alteracoes, tx);
    });
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
