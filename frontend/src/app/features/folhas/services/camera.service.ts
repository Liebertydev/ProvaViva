import { Injectable } from '@angular/core';
import { Camera, CameraDirection, type MediaResult } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';

import { FotoFolhaService } from '../../../core/storage/foto-folha.service';

export interface FotoCapturada {
  imagem: MediaResult;
  caminhoLocal: string;
  formato: 'jpeg' | 'png';
}

@Injectable({ providedIn: 'root' })
export class CameraService {
  constructor(private readonly fotoFolhaService: FotoFolhaService) {}

  async tirarFotoDaFolha(): Promise<FotoCapturada> {
    const imagem = await Camera.takePhoto({
      quality: 90,
      cameraDirection: CameraDirection.Rear,
      correctOrientation: true,
      saveToGallery: false,
      includeMetadata: true,
      webUseInput: true,
    });

    const conteudo = await this.obterBase64(imagem);
    const formatoRecebido = imagem.metadata?.format?.toLowerCase() ?? 'jpeg';
    const formato = formatoRecebido.includes('png')
      ? 'png'
      : formatoRecebido.includes('jpeg') || formatoRecebido.includes('jpg')
        ? 'jpeg'
        : null;

    if (!formato) throw new Error('Use uma imagem JPEG ou PNG para corrigir a folha.');
    const caminhoLocal = await this.fotoFolhaService.salvar(conteudo, formato);

    return { imagem, caminhoLocal, formato };
  }

  async excluirFotoLocal(caminho: string): Promise<void> {
    await this.fotoFolhaService.excluir(caminho);
  }

  private async obterBase64(imagem: MediaResult): Promise<string> {
    if (imagem.uri) {
      const arquivo = await Filesystem.readFile({ path: imagem.uri });
      if (typeof arquivo.data !== 'string') {
        throw new Error('Não foi possível ler a foto da câmera.');
      }
      return arquivo.data;
    }

    if (imagem.thumbnail) return imagem.thumbnail;
    throw new Error('A câmera não retornou os dados da foto.');
  }
}
