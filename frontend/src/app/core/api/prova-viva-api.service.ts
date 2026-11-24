import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenSeguroService } from '../storage/token-seguro.service';

export interface ProfessorAutenticado {
  id: string;
  nome: string;
  email: string;
  matricula: string;
}

export interface RespostaLogin {
  token: string;
  tipo: 'Bearer';
  expiraEm: number;
  professor: ProfessorAutenticado;
}

export interface AvaliacaoDisponivel {
  id: string;
  titulo: string;
  quantidadeQuestoes: number;
}

export type Turno = 'MANHA' | 'TARDE' | 'NOITE';

export interface NovoAluno {
  nome: string;
  matricula: string;
  turno: Turno;
}

export interface AlunoCriado {
  id: number;
  nome: string;
  matricula: string;
  turno: Turno;
}

export interface RespostaCorrecao {
  resultado: {
    id: string;
    alunoId: number;
    avaliacaoId: string;
    respostas: string[];
    acertos: number;
    nota: number;
    status: 'CORRIGIDO' | 'REVISAO_PENDENTE' | 'REVISADO';
    createdAt: string;
    aluno: { nome: string; matricula: string };
    avaliacao: { titulo: string };
  };
  leitura: {
    matricula: string;
    respostas: string[];
    respostasIncertas: number[];
  };
}

@Injectable({ providedIn: 'root' })
export class ProvaVivaApiService {
  private readonly http = inject(HttpClient);
  private readonly tokenSeguro = inject(TokenSeguroService);
  private tokenTemporarioWeb: string | null = null;

  async login(email: string, senha: string): Promise<RespostaLogin> {
    const resposta = await firstValueFrom(
      this.http.post<RespostaLogin>(`${this.baseUrl}/auth/login`, { email, senha }),
    );

    if (Capacitor.isNativePlatform()) {
      await this.tokenSeguro.salvar(resposta.token);
    } else {
      this.tokenTemporarioWeb = resposta.token;
    }

    return resposta;
  }

  async temSessao(): Promise<boolean> {
    return (await this.obterToken()) !== null;
  }

  async sair(): Promise<void> {
    if (Capacitor.isNativePlatform()) await this.tokenSeguro.remover();
    this.tokenTemporarioWeb = null;
  }

  async listarAvaliacoes(): Promise<AvaliacaoDisponivel[]> {
    const headers = await this.criarCabecalhoAutenticado();
    return firstValueFrom(
      this.http.get<AvaliacaoDisponivel[]>(`${this.baseUrl}/avaliacoes`, { headers }),
    );
  }

  async criarAluno(aluno: NovoAluno): Promise<AlunoCriado> {
    const headers = await this.criarCabecalhoAutenticado();
    return firstValueFrom(
      this.http.post<AlunoCriado>(`${this.baseUrl}/alunos`, aluno, { headers }),
    );
  }

  async corrigirFolha(
    avaliacaoId: string,
    fotoUrl: string,
    formato: 'jpeg' | 'png',
  ): Promise<RespostaCorrecao> {
    const headers = await this.criarCabecalhoAutenticado();
    const respostaFoto = await fetch(fotoUrl);
    if (!respostaFoto.ok) throw new Error('Não consegui ler a foto salva para enviar.');

    const original = await respostaFoto.blob();
    const tipoEsperado = formato === 'png' ? 'image/png' : 'image/jpeg';
    const blob = !original.type || original.type === 'image/jpg'
      ? new Blob([original], { type: tipoEsperado })
      : original;

    if (!['image/jpeg', 'image/png'].includes(blob.type.toLowerCase())) {
      throw new Error('O backend aceita somente fotos JPEG ou PNG.');
    }

    const extensao = blob.type.toLowerCase() === 'image/png' ? 'png' : 'jpg';
    const dados = new FormData();
    dados.append('imagem', blob, `folha.${extensao}`);

    return firstValueFrom(
      this.http.post<RespostaCorrecao>(
        `${this.baseUrl}/fotos/avaliacoes/${encodeURIComponent(avaliacaoId)}/corrigir`,
        dados,
        { headers },
      ),
    );
  }

  mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      if (erro.status === 0) {
        return 'Não consegui conectar à API. Confira se o backend está rodando e se o endereço está correto.';
      }

      const payload: unknown = erro.error;
      if (typeof payload === 'object' && payload !== null && 'mensagem' in payload) {
        const mensagem = payload.mensagem;
        if (typeof mensagem === 'string') return mensagem;
      }
    }

    return erro instanceof Error ? erro.message : 'Ocorreu um erro inesperado.';
  }

  sessaoExpirada(erro: unknown): boolean {
    return erro instanceof HttpErrorResponse && erro.status === 401;
  }

  private async criarCabecalhoAutenticado(): Promise<HttpHeaders> {
    const token = await this.obterToken();
    if (!token) throw new Error('Entre com o e-mail e a senha do professor para continuar.');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private async obterToken(): Promise<string | null> {
    return Capacitor.isNativePlatform()
      ? this.tokenSeguro.obter()
      : this.tokenTemporarioWeb;
  }

  private get baseUrl(): string {
    const configurada = Capacitor.getPlatform() === 'android'
      ? environment.apiBaseUrlAndroid
      : environment.apiBaseUrl;

    if (!configurada) {
      throw new Error('Configure a URL da API nos arquivos src/environments.');
    }

    return configurada.replace(/\/$/, '');
  }
}
