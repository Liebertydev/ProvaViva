import { MatriculaPipe } from './matricula.pipe';

describe('MatriculaPipe', () => {
  const pipe = new MatriculaPipe();

  it('agrupa os 8 dígitos em dois blocos de 4', () => {
    expect(pipe.transform('12345678')).toBe('1234.5678');
  });

  it('retorna texto vazio para null ou undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('mantém sem alteração valores fora do padrão de 8 dígitos', () => {
    expect(pipe.transform('1234567')).toBe('1234567');
    expect(pipe.transform('123456789')).toBe('123456789');
    expect(pipe.transform('abcdefgh')).toBe('abcdefgh');
    expect(pipe.transform('1234.5678')).toBe('1234.5678');
  });
});
