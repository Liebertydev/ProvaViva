export interface ConfiguracaoGrade {
  xInicial: number;
  yInicial: number;
  distanciaX: number;
  distanciaY: number;
  colunas: number;
  linhas: number;
  raio: number;
}

export interface ConfiguracaoFolha {
  largura: number;
  altura: number;
  marcadores: {
    tamanhoMm: number;
    posicoes: { x: number; y: number }[];
  };
  matricula: ConfiguracaoGrade;
  respostas: ConfiguracaoGrade;
}

export const modelo: ConfiguracaoFolha = {
  largura: 210,
  altura: 297,
  marcadores: {
    tamanhoMm: 8,
    posicoes: [
      { x: 5, y: 5 },
      { x: 197, y: 5 },
      { x: 197, y: 284 },
      { x: 5, y: 284 },
    ],
  },

  matricula: {
    // Centralização do conjunto: dígitos à esquerda e oito colunas de bolinhas.
    xInicial: 75.27,
    yInicial: 94,
    distanciaX: 10,
    distanciaY: 7,
    colunas: 8,
    linhas: 10,
    raio: 2.4,
  },

  respostas: {
    // Centralização independente, incluindo os números das questões.
    xInicial: 80.72,
    yInicial: 197,
    distanciaX: 16,
    distanciaY: 9,
    colunas: 5,
    linhas: 10,
    raio: 2.6,
  },
};
