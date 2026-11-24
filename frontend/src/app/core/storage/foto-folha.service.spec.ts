import { TestBed } from '@angular/core/testing';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FotoFolhaService } from './foto-folha.service';

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

describe('FotoFolhaService', () => {
  let service: FotoFolhaService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FotoFolhaService);
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file://foto.jpg' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('salva a foto quando randomUUID não está disponível no navegador', async () => {
    vi.stubGlobal('crypto', {});

    await service.salvar('aGVsbG8=', 'jpeg');

    const [opcoes] = vi.mocked(Filesystem.writeFile).mock.calls[0];
    expect(opcoes.directory).toBe(Directory.Data);
    expect(opcoes.path).toMatch(/^folhas\/.+\.jpg$/);
  });
});
