import { Jimp } from 'jimp';
import cvModule from '@techstark/opencv-js';
import AppError from '../errors/AppError.js';
import modeloFolha from './modeloFolha.js';

const pixelsPorMm = 6;
const larguraNormalizada = Math.round(modeloFolha.larguraMm * pixelsPorMm);
const alturaNormalizada = Math.round(modeloFolha.alturaMm * pixelsPorMm);
const areaMinimaPagina = 0.2;
const pixelsMaximosImagem = 30_000_000;
const escoreMarcacao = 0.22;
const escoreRuido = 0.08;

const ordenarPontos = (pontos) => {
  const centro = pontos.reduce(
    (soma, ponto) => ({ x: soma.x + ponto.x / pontos.length, y: soma.y + ponto.y / pontos.length }),
    { x: 0, y: 0 },
  );
  const ordenados = [...pontos].sort(
    (a, b) => Math.atan2(a.y - centro.y, a.x - centro.x) - Math.atan2(b.y - centro.y, b.x - centro.x),
  );
  const indiceSuperiorEsquerdo = ordenados.reduce(
    (melhor, ponto, indice, todos) =>
      ponto.x + ponto.y < todos[melhor].x + todos[melhor].y ? indice : melhor,
    0,
  );

  return [0, 1, 2, 3].map((deslocamento) => ordenados[(indiceSuperiorEsquerdo + deslocamento) % 4]);
};

const distancia = (primeiro, segundo) => Math.hypot(
  segundo.x - primeiro.x,
  segundo.y - primeiro.y,
);

const localizarCantosDaFolha = (cv, imagem) => {
  const cinza = new cv.Mat();
  const suavizada = new cv.Mat();
  const bordas = new cv.Mat();
  const contornos = new cv.MatVector();
  const hierarquia = new cv.Mat();
  let melhorQuadrilatero = null;
  let maiorArea = 0;

  try {
    cv.cvtColor(imagem, cinza, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(cinza, suavizada, new cv.Size(5, 5), 0);
    cv.Canny(suavizada, bordas, 50, 150);
    cv.findContours(bordas, contornos, hierarquia, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const areaImagem = imagem.rows * imagem.cols;
    for (let indice = 0; indice < contornos.size(); indice += 1) {
      const contorno = contornos.get(indice);
      const aproximado = new cv.Mat();

      try {
        const area = Math.abs(cv.contourArea(contorno));
        if (area < areaImagem * areaMinimaPagina || area > areaImagem * 0.98) continue;

        const perimetro = cv.arcLength(contorno, true);
        cv.approxPolyDP(contorno, aproximado, perimetro * 0.02, true);
        if (aproximado.rows !== 4 || area <= maiorArea) continue;

        const valores = aproximado.data32S;
        const pontos = [0, 1, 2, 3].map((ponto) => ({
          x: valores[ponto * 2],
          y: valores[ponto * 2 + 1],
        }));
        melhorQuadrilatero = ordenarPontos(pontos);
        maiorArea = area;
      } finally {
        contorno.delete();
        aproximado.delete();
      }
    }
  } finally {
    cinza.delete();
    suavizada.delete();
    bordas.delete();
    contornos.delete();
    hierarquia.delete();
  }

  if (!melhorQuadrilatero) {
    throw new AppError('Não consegui localizar a folha. Fotografe a página inteira sobre um fundo contrastante.', 422);
  }

  return melhorQuadrilatero;
};

const corrigirPerspectiva = (cv, imagem, cantos) => {
  const larguraFolha = (distancia(cantos[0], cantos[1]) + distancia(cantos[2], cantos[3])) / 2;
  const alturaFolha = (distancia(cantos[1], cantos[2]) + distancia(cantos[3], cantos[0])) / 2;

  if (larguraFolha >= alturaFolha) {
    throw new AppError('A folha precisa aparecer na vertical e com a página inteira visível.', 422);
  }

  const origem = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    cantos.flatMap((ponto) => [ponto.x, ponto.y]),
  );
  const destino = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    larguraNormalizada - 1, 0,
    larguraNormalizada - 1, alturaNormalizada - 1,
    0, alturaNormalizada - 1,
  ]);
  const transformacao = cv.getPerspectiveTransform(origem, destino);
  const retificada = new cv.Mat();

  try {
    cv.warpPerspective(
      imagem,
      retificada,
      transformacao,
      new cv.Size(larguraNormalizada, alturaNormalizada),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255),
    );
    return retificada;
  } catch (error) {
    retificada.delete();
    throw error;
  } finally {
    origem.delete();
    destino.delete();
    transformacao.delete();
  }
};

const medirTinta = (matrizBinaria, xMm, yMm, raioMm) => {
  const centroX = Math.round(xMm * pixelsPorMm);
  const centroY = Math.round(yMm * pixelsPorMm);
  const raio = Math.max(2, Math.floor(raioMm * pixelsPorMm * 0.55));
  let total = 0;
  let pixelsEscuros = 0;

  for (let deslocamentoY = -raio; deslocamentoY <= raio; deslocamentoY += 1) {
    for (let deslocamentoX = -raio; deslocamentoX <= raio; deslocamentoX += 1) {
      if (deslocamentoX ** 2 + deslocamentoY ** 2 > raio ** 2) continue;

      const x = centroX + deslocamentoX;
      const y = centroY + deslocamentoY;
      if (x < 0 || y < 0 || x >= matrizBinaria.cols || y >= matrizBinaria.rows) continue;

      total += 1;
      if (matrizBinaria.data[y * matrizBinaria.cols + x] > 0) pixelsEscuros += 1;
    }
  }

  return total === 0 ? 0 : pixelsEscuros / total;
};

const classificarBolhas = (matrizBinaria, grade, rotulos, posicao) => {
  const escores = rotulos.map((_, indice) => medirTinta(
    matrizBinaria,
    grade.xInicial + indice * grade.distanciaX,
    grade.yInicial + posicao * grade.distanciaY,
    grade.raio,
  ));
  const marcadas = escores
    .map((escore, indice) => ({ escore, indice }))
    .filter(({ escore }) => escore >= escoreMarcacao);

  if (marcadas.length === 1) {
    return { valor: rotulos[marcadas[0].indice], estado: 'MARCADA', escore: marcadas[0].escore };
  }
  if (marcadas.length > 1) {
    return { valor: 'MULTIPLA', estado: 'MULTIPLA', escore: Math.max(...escores) };
  }

  const maiorEscore = Math.max(...escores);
  if (maiorEscore >= escoreRuido) {
    return { valor: 'INCERTA', estado: 'INCERTA', escore: maiorEscore };
  }
  return { valor: 'BRANCA', estado: 'BRANCA', escore: maiorEscore };
};

const lerMatricula = (binaria) => {
  const digitos = Array.from({ length: modeloFolha.matricula.linhas }, (_, indice) => String(indice));
  const colunas = Array.from({ length: modeloFolha.matricula.colunas }, (_, indice) => {
    const leitura = classificarBolhas(binaria, modeloFolha.matricula, digitos, indice);
    if (leitura.estado !== 'MARCADA') {
      throw new AppError(`Não consegui ler a coluna ${indice + 1} da matrícula (${leitura.estado.toLowerCase()}).`, 422);
    }
    return leitura.valor;
  });

  return colunas.join('');
};

const lerRespostas = (binaria) => {
  const alternativas = ['A', 'B', 'C', 'D', 'E'];
  return Array.from({ length: modeloFolha.respostas.linhas }, (_, indice) =>
    classificarBolhas(binaria, modeloFolha.respostas, alternativas, indice));
};

const contarPixelsEscuros = (matrizBinaria, xMm, yMm, larguraMm, alturaMm) => {
  const xInicial = Math.round(xMm * pixelsPorMm);
  const yInicial = Math.round(yMm * pixelsPorMm);
  const largura = Math.round(larguraMm * pixelsPorMm);
  const altura = Math.round(alturaMm * pixelsPorMm);
  let quantidade = 0;

  for (let y = yInicial; y < yInicial + altura; y += 1) {
    for (let x = xInicial; x < xInicial + largura; x += 1) {
      if (matrizBinaria.data[y * matrizBinaria.cols + x] > 0) quantidade += 1;
    }
  }

  return quantidade;
};

const corrigirOrientacaoDeCabecaParaBaixo = (cv, binaria) => {
  const cabecalhoNoTopo = contarPixelsEscuros(binaria, 15, 15, 180, 45);
  const cabecalhoEmbaixo = contarPixelsEscuros(binaria, 15, 237, 180, 45);

  if (cabecalhoEmbaixo <= cabecalhoNoTopo * 1.2) return binaria;

  const rotacionada = new cv.Mat();
  cv.rotate(binaria, rotacionada, cv.ROTATE_180);
  binaria.delete();
  return rotacionada;
};

const lerFolha = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('A imagem enviada está vazia ou inválida.', 400);
  }

  let foto;
  try {
    foto = await Jimp.read(buffer);
  } catch {
    throw new AppError('O arquivo enviado não é uma imagem legível.', 400);
  }

  if (foto.bitmap.width * foto.bitmap.height > pixelsMaximosImagem) {
    throw new AppError('A imagem tem resolução muito alta. Envie uma foto com até 30 megapixels.', 413);
  }

  const cv = await cvModule;
  const imagem = cv.matFromImageData(foto.bitmap);
  let retificada;
  let cinza;
  let binaria;

  try {
    const cantos = localizarCantosDaFolha(cv, imagem);
    retificada = corrigirPerspectiva(cv, imagem, cantos);
    cinza = new cv.Mat();
    binaria = new cv.Mat();
    cv.cvtColor(retificada, cinza, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(
      cinza,
      binaria,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      31,
      10,
    );
    binaria = corrigirOrientacaoDeCabecaParaBaixo(cv, binaria);

    const matricula = lerMatricula(binaria);
    const leituras = lerRespostas(binaria);
    return {
      matricula,
      respostas: leituras.map((leitura) => leitura.valor),
      respostasIncertas: leituras
        .map((leitura, indice) => (leitura.estado === 'MARCADA' || leitura.estado === 'BRANCA' ? null : indice + 1))
        .filter((questao) => questao !== null),
    };
  } finally {
    imagem.delete();
    retificada?.delete();
    cinza?.delete();
    binaria?.delete();
  }
};

export default { lerFolha };
