import { TestBed } from '@angular/core/testing';

import { BancoLocal } from './banco-local';

describe('BancoLocal', () => {
  let service: BancoLocal;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BancoLocal);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
