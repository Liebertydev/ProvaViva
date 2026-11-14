
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
  matricula: ConfiguracaoGrade;
  respostas: ConfiguracaoGrade;
}

export const modelo: ConfiguracaoFolha = {
  largura: 210,
  altura: 297,

  matricula: {
    xInicial: 38,
    yInicial: 68,
    distanciaX: 18,
    distanciaY: 7,
    colunas: 8,
    linhas: 10,
    raio: 2.4
  },

  respostas: {
    xInicial: 55,
    yInicial: 165,
    distanciaX: 20,
    distanciaY: 9,
    colunas: 5,
    linhas: 10,
    raio: 2.8
  }
};
