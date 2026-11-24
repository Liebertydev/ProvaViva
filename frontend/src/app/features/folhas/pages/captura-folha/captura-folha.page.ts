import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CameraErrorCode } from '@capacitor/camera';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  bulbOutline,
  cameraOutline,
  checkmarkDoneOutline,
  logInOutline,
  logOutOutline,
  personCircleOutline,
  refreshOutline,
  scanOutline,
  trashOutline,
} from 'ionicons/icons';

import {
  ProvaVivaApiService,
  type AvaliacaoDisponivel,
  type RespostaCorrecao,
} from '../../../../core/api/prova-viva-api.service';
import { AppRepeatDirective } from '../../../../shared/directives/app-repeat.directive';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'app-captura-folha',
  templateUrl: './captura-folha.page.html',
  styleUrl: './captura-folha.page.scss',
  standalone: true,
  imports: [
    AppRepeatDirective,
    FormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class CapturaFolhaPage implements OnInit, OnDestroy {
  private readonly cameraService = inject(CameraService);
  private readonly api = inject(ProvaVivaApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private caminhoTemporario?: string;

  email = '';
  senha = '';
  professorNome = '';
  autenticado = false;
  avaliacoes: AvaliacaoDisponivel[] = [];
  avaliacaoId = '';
  resultado: RespostaCorrecao | null = null;
  fotoUrl: string | null = null;
  caminhoLocal: string | null = null;
  carregando = false;
  carregandoAvaliacoes = false;
  enviandoCorrecao = false;
  formatoFoto: 'jpeg' | 'png' = 'jpeg';
  mensagemErro = '';

  constructor() {
    addIcons({
      alertCircleOutline,
      bulbOutline,
      cameraOutline,
      checkmarkDoneOutline,
      logInOutline,
      logOutOutline,
      personCircleOutline,
      refreshOutline,
      scanOutline,
      trashOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.autenticado = await this.api.temSessao();
      if (this.autenticado) await this.carregarAvaliacoes();
    } catch {
      this.autenticado = false;
    }
    this.changeDetector.markForCheck();
  }

  async entrar(): Promise<void> {
    if (!this.email.trim() || !this.senha) {
      this.mensagemErro = 'Informe o e-mail e a senha do professor.';
      return;
    }

    this.carregando = true;
    this.mensagemErro = '';

    try {
      const sessao = await this.api.login(this.email.trim(), this.senha);
      this.professorNome = sessao.professor.nome;
      this.autenticado = true;
      this.senha = '';
      await this.carregarAvaliacoes();
      this.changeDetector.markForCheck();
    } catch (erro: unknown) {
      this.mensagemErro = this.api.mensagemErro(erro);
      this.changeDetector.markForCheck();
    } finally {
      this.carregando = false;
      this.changeDetector.markForCheck();
    }
  }

  async sair(): Promise<void> {
    await this.removerFoto();
    await this.api.sair();
    this.autenticado = false;
    this.professorNome = '';
    this.avaliacoes = [];
    this.avaliacaoId = '';
    this.resultado = null;
    this.mensagemErro = '';
    this.changeDetector.markForCheck();
  }

  async carregarAvaliacoes(): Promise<void> {
    this.carregandoAvaliacoes = true;
    this.mensagemErro = '';

    try {
      this.avaliacoes = await this.api.listarAvaliacoes();
      if (!this.avaliacoes.some((avaliacao) => avaliacao.id === this.avaliacaoId)) {
        this.avaliacaoId = this.avaliacoes[0]?.id ?? '';
      }
    } catch (erro: unknown) {
      this.mensagemErro = this.api.mensagemErro(erro);
      this.avaliacoes = [];
      if (this.api.sessaoExpirada(erro)) {
        await this.api.sair();
        this.autenticado = false;
      }
    } finally {
      this.carregandoAvaliacoes = false;
      this.changeDetector.markForCheck();
    }
  }

  avaliacaoAlterada(): void {
    this.resultado = null;
  }

  async tirarFoto(): Promise<void> {
    if (this.carregando) return;

    this.carregando = true;
    this.mensagemErro = '';
    this.changeDetector.markForCheck();

    try {
      const caminhoAnterior = this.caminhoLocal;
      const captura = await this.cameraService.tirarFotoDaFolha();
      const url = captura.imagem.webPath;

      if (!url) {
        throw new Error('A câmera não retornou um caminho para mostrar a foto.');
      }

      this.liberarUrlTemporaria();
      this.fotoUrl = url;
      this.caminhoLocal = captura.caminhoLocal;
      this.formatoFoto = captura.formato;
      this.resultado = null;
      if (url.startsWith('blob:')) this.caminhoTemporario = url;

      if (caminhoAnterior && caminhoAnterior !== captura.caminhoLocal) {
        try {
          await this.cameraService.excluirFotoLocal(caminhoAnterior);
        } catch {
          this.mensagemErro = 'A nova foto foi salva, mas não consegui remover a cópia anterior.';
        }
      }
    } catch (erro: unknown) {
      const codigo = this.obterCodigoErro(erro);

      if (codigo === CameraErrorCode.TakePhotoCancelled) return;

      if (codigo === CameraErrorCode.CameraPermissionDenied) {
        this.mensagemErro = 'Permita o acesso à câmera nas configurações do dispositivo e tente novamente.';
      } else {
        this.mensagemErro = this.api.mensagemErro(erro);
      }
    } finally {
      this.carregando = false;
      this.changeDetector.markForCheck();
    }
  }

  async removerFoto(): Promise<void> {
    const caminho = this.caminhoLocal;
    this.liberarUrlTemporaria();
    this.fotoUrl = null;
    this.caminhoLocal = null;
    this.resultado = null;
    this.mensagemErro = '';

    if (!caminho) return;

    try {
      await this.cameraService.excluirFotoLocal(caminho);
    } catch {
      this.mensagemErro = 'Não foi possível remover a cópia local da foto.';
    }
  }

  async corrigirFolha(): Promise<void> {
    if (!this.fotoUrl || !this.avaliacaoId || this.enviandoCorrecao) return;

    this.enviandoCorrecao = true;
    this.mensagemErro = '';
    this.resultado = null;
    this.changeDetector.markForCheck();

    try {
      this.resultado = await this.api.corrigirFolha(this.avaliacaoId, this.fotoUrl, this.formatoFoto);
    } catch (erro: unknown) {
      this.mensagemErro = this.api.mensagemErro(erro);
    } finally {
      this.enviandoCorrecao = false;
      this.changeDetector.markForCheck();
    }
  }

  async novaCorrecao(): Promise<void> {
    await this.removerFoto();
    this.resultado = null;
  }

  get respostasLidas(): string {
    return this.resultado?.leitura.respostas.join(' · ') ?? '';
  }

  get questoesRevisao(): string {
    return this.resultado?.leitura.respostasIncertas.join(', ') ?? '';
  }

  ngOnDestroy(): void {
    this.liberarUrlTemporaria();
  }

  private obterCodigoErro(erro: unknown): string | null {
    if (typeof erro !== 'object' || erro === null || !('code' in erro)) return null;
    return typeof erro.code === 'string' ? erro.code : null;
  }

  private liberarUrlTemporaria(): void {
    if (this.caminhoTemporario) URL.revokeObjectURL(this.caminhoTemporario);
    this.caminhoTemporario = undefined;
  }
}
