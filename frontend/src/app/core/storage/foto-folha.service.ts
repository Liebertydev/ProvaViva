import { Injectable } from '@angular/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

@Injectable({ providedIn: 'root' })
export class FotoFolhaService {
  private readonly diretorio = 'folhas';

  async salvar(base64: string): Promise<string> {
    const conteudo = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    if (!conteudo) throw new Error('A imagem da folha está vazia.');

    const caminho = `${this.diretorio}/${crypto.randomUUID()}.jpg`;
    await Filesystem.writeFile({
      path: caminho,
      data: conteudo,
      directory: Directory.Data,
      recursive: true,
    });
    return caminho;
  }

  async ler(caminho: string): Promise<string> {
    const { data } = await Filesystem.readFile({ path: caminho, directory: Directory.Data });
    if (typeof data !== 'string') throw new Error('Não foi possível ler a imagem salva no dispositivo.');
    return data;
  }

  async excluir(caminho: string): Promise<void> {
    await Filesystem.deleteFile({ path: caminho, directory: Directory.Data });
  }
}
