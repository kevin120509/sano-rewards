import { describe, expect, it } from 'vitest';
import { daysLeft, firstName, isEmail, localDay, normalizePhone, progressPercent, resolveTheme, stampsFor, tokenFromInput, visitedToday, visitsRemaining } from '../src/domain/card';
import { buildTheme } from '../src/domain/themes';
import type { CardView } from '../src/domain/types';

const base: CardView = {
  code: 'G-4821', full_name: 'Ana Pérez', group: { name: 'GYM', prefix: 'G', primary_color: '#111411', accent_color: '#C6F432' },
  tier: { code: 'consentido', name: 'Cliente Consentido', expires_at: null }, visits_count: 5, visits_goal: 8,
  period_ends_at: '2026-11-01T06:00:00Z', rewards_ready: [], recent_visits: [],
};

describe('tarjeta', () => {
  it('marca sellos llenos y el regalo al final', () => {
    const s = stampsFor(base);
    expect(s).toHaveLength(8);
    expect(s.filter((x) => x.filled)).toHaveLength(5);
    expect(s[7].isGift).toBe(true);
  });
  it('Premium usa meta 4', () => {
    expect(stampsFor({ visits_count: 4, visits_goal: 4 }).every((s) => s.filled)).toBe(true);
  });
  it('no pasa de la meta ni baja de 0', () => {
    expect(stampsFor({ visits_count: 99, visits_goal: 8 }).filter((s) => s.filled)).toHaveLength(8);
    expect(visitsRemaining({ visits_count: 9, visits_goal: 8 })).toBe(0);
    expect(progressPercent({ visits_count: 4, visits_goal: 8 })).toBe(50);
  });
  it('1 visita por día en hora de Mérida', () => {
    const now = new Date('2026-10-06T20:00:00Z');
    expect(visitedToday({ recent_visits: ['2026-10-06T15:00:00Z'] }, now)).toBe(true);
    expect(visitedToday({ recent_visits: ['2026-10-05T15:00:00Z'] }, now)).toBe(false);
    // 03:00Z del día 7 sigue siendo 6 de octubre en Mérida (UTC-6)
    expect(localDay('2026-10-07T03:00:00Z')).toBe('2026-10-06');
  });
  it('días restantes', () => {
    expect(daysLeft('2026-10-10T00:00:00Z', new Date('2026-10-06T12:00:00Z'))).toBe(4);
    expect(daysLeft('2026-10-01T00:00:00Z', new Date('2026-10-06T12:00:00Z'))).toBe(0);
  });
});

describe('validaciones', () => {
  it('teléfono como la BD', () => {
    expect(normalizePhone('999 123 4567')).toBe('9991234567');
    expect(normalizePhone('+52 (999) 123-4567')).toBe('+529991234567');
    expect(normalizePhone('12345')).toBeNull();
  });
  it('correo', () => { expect(isEmail('a@b.co')).toBe(true); expect(isEmail('a@b')).toBe(false); });
  it('token desde enlace o pelado', () => {
    expect(tokenFromInput('https://x.app/r/abc123XYZ')).toBe('abc123XYZ');
    expect(tokenFromInput('abc123XYZ')).toBe('abc123XYZ');
    expect(tokenFromInput('hola')).toBeNull();
  });
  it('primer nombre', () => { expect(firstName('  Ana  María ')).toBe('Ana'); expect(firstName(null)).toBe(''); });
});

describe('diseño por grupo', () => {
  it('deduce el tema por nombre y respeta theme explícito', () => {
    expect(resolveTheme({ name: 'GYM' })).toBe('sport');
    expect(resolveTheme({ name: 'Estudiantes' })).toBe('notebook');
    expect(resolveTheme({ name: 'OSO' })).toBe('waves');
    expect(resolveTheme({ name: 'Cliente Consentido' })).toBe('classic');
    expect(resolveTheme({ name: 'GYM', theme: 'waves' })).toBe('waves');
  });
  it('el diseño Sano es el mismo para todos y no aplica piel Premium', () => {
    const t = buildTheme(base.group, { tier: { code: 'premium', name: 'Premium', expires_at: null } });
    expect(t.skin).toBe('sano');
    expect(t.premium).toBe(false);
    expect(t.vars['--primary']).toBe('#5E4B3D');
    expect(buildTheme(base.group, base).vars).toEqual(t.vars);
  });
});

import { motivation, rewardLabel, stampTilt, validityLabel } from '../src/domain/card';

describe('tarjeta realista y premio', () => {
  it('cada sello tiene una inclinación fija', () => {
    expect(stampTilt(1)).toBe(stampTilt(1));
    expect(stampTilt(1)).not.toBe(stampTilt(2));
    expect(stampTilt(9)).toBe(stampTilt(1));
  });
  it('premio: BD primero, luego genérico', () => {
    expect(rewardLabel({ rewards_ready: [], next_reward: null }, 'un premio')).toBe('un premio');
    expect(rewardLabel({ rewards_ready: [], next_reward: { name: 'una bebida gratis' } }, 'x')).toBe('una bebida gratis');
    expect(rewardLabel({ rewards_ready: [{ card_id: '1', completed_at: '', discount_name: 'Frappé', description: null }], next_reward: { name: 'otro' } }, 'x')).toBe('Frappé');
  });
  it('mensaje según lo que falta', () => {
    expect(motivation(1)).toMatch(/próxima/);
    expect(motivation(0)).toMatch(/lograste/);
    expect(motivation(6)).toMatch(/acerca/);
  });
  it('vigencia = mes en curso de Mérida', () => {
    expect(validityLabel('2026-11-01T06:00:00Z')).toBe('Octubre de 2026');
  });
});
