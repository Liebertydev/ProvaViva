import AppError from '../errors/AppError.js';
import alunoRepository from '../repositories/alunoRepository.js';
import avaliacaoRepository from '../repositories/avaliacaoRepository.js';
import resultadoRepository from '../repositories/resultadoRepository.js';
import avaliacaoService from './avaliacaoService.js';
import leitorFolhaService from './leitorFolhaService.js';

class CorrecaoFolhaService {
  async corrigir({ imagem, avaliacaoId, professorId }) {
    await avaliacaoService.buscarAvaliacaoPorId(avaliacaoId, professorId);
    const leitura = await leitorFolhaService.lerFolha(imagem);
    const aluno = await alunoRepository.buscarPorMatricula(leitura.matricula);

    if (!aluno) {
      throw new AppError(`Não existe aluno cadastrado com a matrícula ${leitura.matricula}.`, 404);
    }
    if (!aluno.ativo) {
      throw new AppError('O aluno identificado está inativo e não pode receber resultado.', 409);
    }
    return avaliacaoRepository.executarTransacao(async (tx) => {
      const avaliacaoBloqueada = await avaliacaoRepository.buscarPorIdParaCorrigir(
        avaliacaoId,
        professorId,
        tx,
      );

      if (!avaliacaoBloqueada) {
        throw new AppError('Avaliação não encontrada.', 404);
      }
      if (avaliacaoBloqueada.gabarito.length !== leitura.respostas.length) {
        throw new AppError('A quantidade de respostas da folha não corresponde ao gabarito da avaliação.', 409);
      }

      const acertos = leitura.respostas.reduce(
        (total, resposta, indice) => total + (resposta === avaliacaoBloqueada.gabarito[indice] ? 1 : 0),
        0,
      );
      const nota = Number(((acertos / avaliacaoBloqueada.gabarito.length) * 10).toFixed(2));
      const status = leitura.respostasIncertas.length > 0 ? 'REVISAO_PENDENTE' : 'CORRIGIDO';
      const resultado = await resultadoRepository.criar({
        alunoId: aluno.id,
        avaliacaoId: avaliacaoBloqueada.id,
        respostas: leitura.respostas,
        acertos,
        nota,
        status,
      }, tx);

      return {
        resultado,
        leitura: {
          matricula: leitura.matricula,
          respostas: leitura.respostas,
          respostasIncertas: leitura.respostasIncertas,
        },
      };
    });
  }
}

export default new CorrecaoFolhaService();
