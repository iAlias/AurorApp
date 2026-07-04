import { hashSeed, mulberry32 } from '../../../src/core/planner/rng';

describe('hashSeed', () => {
  test('è deterministico per la stessa stringa', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
  });

  test('produce valori diversi per stringhe diverse', () => {
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
  });

  test('ritorna sempre un intero unsigned a 32 bit', () => {
    const h = hashSeed('AurorApp|2026-07-04|0|sole');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  test('stringa vuota ritorna la offset basis FNV-1a', () => {
    expect(hashSeed('')).toBe(2166136261);
  });
});

describe('mulberry32', () => {
  test('sequenza stabile per seed 42 (snapshot 3 valori)', () => {
    const rng = mulberry32(42);
    expect(rng()).toBe(0.6011037519201636);
    expect(rng()).toBe(0.44829055899754167);
    expect(rng()).toBe(0.8524657934904099);
  });

  test('produce sempre valori in [0,1) su 10000 estrazioni', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('stesso seed produce sempre la stessa sequenza', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test('semi diversi producono sequenze diverse', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});
