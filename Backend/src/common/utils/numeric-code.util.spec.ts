/// <reference types="jest" />

import { fromNumericCode, toNumericCode } from './numeric-code.util';

// Verifica que el código visible sea numérico y que el mapeo sea reversible.
describe('numeric-code.util', () => {
  it('genera un código numérico a partir de un UUID', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const numericCode = toNumericCode(uuid);

    expect(numericCode).toMatch(/^[0-9]+$/);
    expect(numericCode).not.toContain('-');
    expect(numericCode.length).toBeGreaterThan(0);
  });

  it('permite reconstruir el UUID original desde el código numérico', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const numericCode = toNumericCode(uuid);

    expect(fromNumericCode(numericCode)).toBe(uuid);
  });
});

