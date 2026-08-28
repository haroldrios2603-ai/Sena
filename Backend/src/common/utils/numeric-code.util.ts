/**
 * Utilitarios para convertir identificadores UUID a códigos numéricos.
 *
 * ES: La idea es mantener la estructura interna del sistema (UUID) intacta,
 * pero mostrar una representación numérica para tickets, pagos y reportes.
 * Este mapeo es reversible, por lo que no se rompe la lógica de negocio.
 */

export function toNumericCode(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return '0';
  }

  const normalizedUuid = normalized.replace(/-/g, '').toLowerCase();

  if (!/^[0-9a-f]+$/.test(normalizedUuid)) {
    return normalized.replace(/\D/g, '') || '0';
  }

  const decimalValue = BigInt(`0x${normalizedUuid}`);
  return decimalValue.toString(10);
}

export function fromNumericCode(value: string): string {
  const normalized = value.trim();

  if (!normalized || !/^\d+$/.test(normalized)) {
    return '';
  }

  const hexValue = BigInt(normalized).toString(16).padStart(32, '0');

  const uuid = [
    hexValue.slice(0, 8),
    hexValue.slice(8, 12),
    hexValue.slice(12, 16),
    hexValue.slice(16, 20),
    hexValue.slice(20, 32),
  ].join('-');

  return uuid;
}
