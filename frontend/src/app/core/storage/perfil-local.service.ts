import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

// Representa os dados básicos que queremos guardar do usuário.
export interface PerfilLocal {
  id: number;
  nome: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class PerfilLocalService {
  // Nome da chave utilizada para encontrar o perfil no armazenamento.
  private readonly CHAVE_PERFIL = 'perfil_usuario';

  // Salva o perfil no dispositivo.
  async salvarPerfil(perfil: PerfilLocal): Promise<void> {
    await Preferences.set({
      key: this.CHAVE_PERFIL,
      value: JSON.stringify(perfil),
    });
  }

  // Recupera o perfil salvo no dispositivo.
  async obterPerfil(): Promise<PerfilLocal | null> {
    const { value } = await Preferences.get({
      key: this.CHAVE_PERFIL,
    });

    if (!value) {
      return null;
    }

    return JSON.parse(value) as PerfilLocal;
  }

  // Remove o perfil do dispositivo.
  async removerPerfil(): Promise<void> {
    await Preferences.remove({
      key: this.CHAVE_PERFIL,
    });
  }
}
