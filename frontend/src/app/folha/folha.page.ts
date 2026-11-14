
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

  modelo = modelo;

  colunasMatricula: number[] = [];
  digitos: number[] = [];

  ngOnInit(): void {

    // Gerando as 8 colunas da matrícula
    for (let i = 0; i < this.modelo.matricula.colunas; i++) {
      this.colunasMatricula.push(i);
    }

    // Gerando os 10 dígitos (0 a 9)
    for (let i = 0; i < this.modelo.matricula.linhas; i++) {
      this.digitos.push(i);
    }

    console.log('Colunas:', this.colunasMatricula);
    console.log('Dígitos:', this.digitos);
  }
}

