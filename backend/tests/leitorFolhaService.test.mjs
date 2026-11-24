import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Jimp } from 'jimp';
import leitorFolhaService from '../src/services/leitorFolhaService.js';
import modeloFolha from '../src/services/modeloFolha.js';

const criarFotoComFolhaDeBaixoContraste = async (matricula = '') => {
  const escala = 4;
  const margem = 80;
  const largura = margem * 2 + modeloFolha.larguraMm * escala;
  const altura = margem * 2 + modeloFolha.alturaMm * escala;
  const imagem = new Jimp({ width: largura, height: altura });
  const pixels = imagem.bitmap.data;

  const preencherRetangulo = (x, y, larguraRetangulo, alturaRetangulo, cor) => {
    for (let linha = y; linha < y + alturaRetangulo; linha += 1) {
      for (let coluna = x; coluna < x + larguraRetangulo; coluna += 1) {
        const indice = (linha * largura + coluna) * 4;
        pixels[indice] = cor[0];
        pixels[indice + 1] = cor[1];
        pixels[indice + 2] = cor[2];
        pixels[indice + 3] = 255;
      }
    }
  };

  const preencherCirculo = (centroX, centroY, raio, cor) => {
    for (let y = centroY - raio; y <= centroY + raio; y += 1) {
      for (let x = centroX - raio; x <= centroX + raio; x += 1) {
        if ((x - centroX) ** 2 + (y - centroY) ** 2 > raio ** 2) continue;
        preencherRetangulo(x, y, 1, 1, cor);
      }
    }
  };

  preencherRetangulo(0, 0, largura, altura, [220, 220, 220]);
  preencherRetangulo(
    margem,
    margem,
    modeloFolha.larguraMm * escala,
    modeloFolha.alturaMm * escala,
    [255, 255, 255],
  );

  for (const posicao of modeloFolha.marcadores.posicoes) {
    preencherRetangulo(
      margem + posicao.x * escala,
      margem + posicao.y * escala,
      modeloFolha.marcadores.tamanhoMm * escala,
      modeloFolha.marcadores.tamanhoMm * escala,
      [0, 0, 0],
    );
  }

  for (const [coluna, digito] of [...matricula].entries()) {
    const x = Math.round(margem + (modeloFolha.matricula.xInicial + coluna * modeloFolha.matricula.distanciaX) * escala);
    const y = Math.round(margem + (modeloFolha.matricula.yInicial + Number(digito) * modeloFolha.matricula.distanciaY) * escala);
    const raio = Math.round(escala * 1.6);
    if (coluna === 0) {
      preencherRetangulo(x - 12, y - 12, 24, 24, [130, 130, 130]);
      preencherCirculo(x, y, raio, [123, 123, 123]);
    } else {
      preencherCirculo(x, y, raio, [30, 30, 30]);
    }
  }

  return imagem.getBuffer('image/png');
};

test('lê os oito dígitos mesmo quando o primeiro tem pouco contraste', async () => {
  const foto = await criarFotoComFolhaDeBaixoContraste('73619482');
  const leitura = await leitorFolhaService.lerFolha(foto);

  assert.equal(leitura.matricula, '73619482');
});

test('rejeita matrícula com uma posição sem marcação', async () => {
  const foto = await criarFotoComFolhaDeBaixoContraste('3619482');

  await assert.rejects(
    leitorFolhaService.lerFolha(foto),
    (erro) => erro.message === 'Não consegui ler a coluna 8 da matrícula (branca).',
  );
});
