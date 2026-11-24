
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar
} from '@ionic/angular';

import { modelo } from './modelo-config';

@Component({
  selector: 'app-folha',
  templateUrl: './folha.page.html',
  styleUrls: ['./folha.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar
  ]
})
export class FolhaPage implements OnInit {

  // Configuração da folha A4
  modelo = modelo;

  // Arrays da matrícula
  colunasMatricula: number[] = [];
  digitos: number[] = [];

  // Arrays das respostas
  questoes: number[] = [];
  alternativas: string[] = ['A', 'B', 'C', 'D', 'E'];

  ngOnInit(): void {

    // Gera as 8 posições da matrícula
    for (let i = 0; i < this.modelo.matricula.colunas; i++) {
      this.colunasMatricula.push(i);
    }

    // Gera os 10 dígitos possíveis (0 a 9)
    for (let i = 0; i < this.modelo.matricula.linhas; i++) {
      this.digitos.push(i);
    }

    // Gera os índices das 10 questões (0 a 9)
    for (let i = 0; i < this.modelo.respostas.linhas; i++) {
      this.questoes.push(i);
    }

    console.log('Colunas da matrícula:', this.colunasMatricula);
    console.log('Dígitos:', this.digitos);
    console.log('Questões:', this.questoes);
    console.log('Alternativas:', this.alternativas);
  }
}
