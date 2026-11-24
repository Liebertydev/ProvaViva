import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { alertCircleOutline, checkmarkCircleOutline, logInOutline, personAddOutline } from 'ionicons/icons';

import { ProvaVivaApiService, type AlunoCriado, type Turno } from '../../../../core/api/prova-viva-api.service';
import { MATRICULA_PURA, MatriculaPipe } from '../../../../shared/pipes/matricula.pipe';

interface OpcaoTurno {
  readonly valor: Turno;
  readonly rotulo: string;
}

@Component({
  selector: 'app-form-aluno',
  templateUrl: './form-aluno.page.html',
  styleUrl: './form-aluno.page.scss',
  imports: [
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
    MatriculaPipe,
    RouterLink,
  ],
})
export class FormAlunoPage {
  private readonly api = inject(ProvaVivaApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly turnos: readonly OpcaoTurno[] = [
    { valor: 'MANHA', rotulo: 'Manhã' },
    { valor: 'TARDE', rotulo: 'Tarde' },
    { valor: 'NOITE', rotulo: 'Noite' },
  ];

  nome = '';
  matricula = '';
  turno: Turno | '' = '';

  /** Liga as mensagens de validação depois da primeira tentativa de envio. */
  tentouEnviar = false;
  enviando = false;
  semSessao = false;
  erro = '';
  alunoCriado: AlunoCriado | null = null;

  constructor() {
    addIcons({ alertCircleOutline, checkmarkCircleOutline, logInOutline, personAddOutline });
  }

  /**
   * O Ionic mantém a página em cache na pilha de navegação, então ngOnInit não roda de novo
   * quando o professor volta do login. Este gancho roda sempre que a página aparece.
   */
  async ionViewWillEnter(): Promise<void> {
    const estavaSemSessao = this.semSessao;
    this.semSessao = !(await this.api.temSessao());
    // O erro exibido veio da falta de sessão; com o professor logado de volta, ele não vale mais.
    // Erros de outro tipo (ex.: matrícula duplicada) continuam até o próximo envio.
    if (estavaSemSessao && !this.semSessao) this.erro = '';
    this.changeDetector.markForCheck();
  }

  get nomeValido(): boolean {
    return this.nome.trim().length > 0;
  }

  get matriculaValida(): boolean {
    return MATRICULA_PURA.test(this.matricula.trim());
  }

  get turnoValido(): boolean {
    return this.turnos.some((opcao) => opcao.valor === this.turno);
  }

  get formularioValido(): boolean {
    return this.nomeValido && this.matriculaValida && this.turnoValido;
  }

  async cadastrar(): Promise<void> {
    if (this.enviando) return;

    this.tentouEnviar = true;
    const turno = this.turno;
    // turno === '' já é coberto por formularioValido; a checagem explícita estreita o tipo para Turno.
    if (!this.formularioValido || turno === '') return;

    this.enviando = true;
    this.erro = '';
    this.alunoCriado = null;
    this.changeDetector.markForCheck();

    try {
      this.alunoCriado = await this.api.criarAluno({
        nome: this.nome.trim(),
        matricula: this.matricula.trim(),
        turno,
      });
      this.semSessao = false;
      this.limparFormulario();
    } catch (erro: unknown) {
      this.erro = this.api.mensagemErro(erro);
      if (this.api.sessaoExpirada(erro)) {
        await this.api.sair();
        this.semSessao = true;
      } else {
        this.semSessao = !(await this.api.temSessao());
      }
    } finally {
      this.enviando = false;
      this.changeDetector.markForCheck();
    }
  }

  private limparFormulario(): void {
    this.nome = '';
    this.matricula = '';
    this.turno = '';
    this.tentouEnviar = false;
  }
}
