import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PerfilLocal } from './perfil-local.service';
import { PerfilLocalService } from './perfil-local.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    remove: vi.fn(),
    set: vi.fn(),
  },
}));

describe('PerfilLocalService', () => {
  let service: PerfilLocalService;
  const perfil: PerfilLocal = {
    id: 17,
    nome: 'Ana Silva',
    email: 'ana@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerfilLocalService);
  });

  it('salva o perfil serializado na chave local', async () => {
    await service.salvarPerfil(perfil);

    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'perfil_usuario',
      value: JSON.stringify(perfil),
    });
  });

  it('recupera e desserializa o perfil salvo', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(perfil) });

    await expect(service.obterPerfil()).resolves.toEqual(perfil);
    expect(Preferences.get).toHaveBeenCalledWith({ key: 'perfil_usuario' });
  });

  it('retorna null quando não existe perfil salvo', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });

    await expect(service.obterPerfil()).resolves.toBeNull();
  });

  it('remove o perfil salvo na chave local', async () => {
    await service.removerPerfil();

    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'perfil_usuario' });
  });
});
