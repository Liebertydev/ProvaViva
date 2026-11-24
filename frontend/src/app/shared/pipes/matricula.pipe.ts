import { Pipe, type PipeTransform } from '@angular/core';

// Exatamente 8 dígitos e nada mais: aceita "12345678"; rejeita "1234567", "1234.5678" e "1234a678".
// Teste: https://regex101.com/?regex=%5E%5Cd%7B8%7D%24&testString=12345678%0A1234567%0A1234.5678%0A1234a678
export const MATRICULA_PURA = /^\d{8}$/;
const TAMANHO_BLOCO = 4;

/**
 * Exibe a matrícula de 8 dígitos agrupada em dois blocos de 4 (ex.: 12345678 -> 1234.5678).
 * Só altera a exibição: o valor guardado e enviado à API continua com os 8 dígitos puros.
 * Valores fora do padrão de 8 dígitos são exibidos sem alteração.
 */
@Pipe({ name: 'matricula' })
export class MatriculaPipe implements PipeTransform {
  transform(matricula: string | null | undefined): string {
    if (matricula == null) return '';
    if (!MATRICULA_PURA.test(matricula)) return matricula;

    return `${matricula.slice(0, TAMANHO_BLOCO)}.${matricula.slice(TAMANHO_BLOCO)}`;
  }
}
