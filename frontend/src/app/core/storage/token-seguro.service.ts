import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class TokenSeguroService {
  private readonly chaveToken = 'token_sessao';

  async salvar(token: string): Promise<void> {
    this.exigirDispositivoNativo();
    await SecureStorage.set(this.chaveToken, token);
  }

  async obter(): Promise<string | null> {
    this.exigirDispositivoNativo();
    const valor = await SecureStorage.get(this.chaveToken);
    return typeof valor === 'string' ? valor : null;
  }

  async remover(): Promise<void> {
    this.exigirDispositivoNativo();
    await SecureStorage.remove(this.chaveToken);
  }

  private exigirDispositivoNativo(): void {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('O armazenamento seguro de sessão requer o aplicativo Android ou iOS.');
    }
  }
}
