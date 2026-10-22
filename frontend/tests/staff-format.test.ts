import { describe, expect, it } from 'vitest';
import { receiptReason } from '../src/lib/staff-format';

describe('nota de compra de Loyverse', () => {
  it('traduce los códigos internos de cupones', () => {
    expect(receiptReason('sello · coldfoam: redeemed')).toBe('sello · cupón de cold foam: canjeado');
    expect(receiptReason('bebida: not_yet')).toBe('cupón de bebida: aún no se podía canjear');
    expect(receiptReason('coldfoam: daily_limit')).toBe('cupón de cold foam: no se canjeó, ya había usado un cupón ese día');
  });
  it('da formato de pesos al mínimo y lo pagado', () => {
    expect(receiptReason('sin sello: pagó 64 (mínimo 65.00)')).toBe('sin sello: pagó $64 (mínimo $65)');
  });
  it('sin nota usa el estado', () => {
    expect(receiptReason(null, 'error')).toBe('con error (se reintenta en la noche)');
    expect(receiptReason('sin sello: ya tenía sello hoy')).toBe('sin sello: ya tenía sello hoy');
  });
});
