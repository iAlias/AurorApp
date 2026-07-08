import { makeMemoryDeck } from '../../../src/core/games/memoryDeck';
import { mulberry32 } from '../../../src/core/planner/rng';

describe('makeMemoryDeck', () => {
  test('genera 6 carte', () => {
    const deck = makeMemoryDeck(mulberry32(1));
    expect(deck).toHaveLength(6);
  });

  test('id 0..5 stabili, uno per carta', () => {
    const deck = makeMemoryDeck(mulberry32(2));
    expect(deck.map((c) => c.id).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test('esattamente 3 coppie (ogni emoji compare 2 volte, 3 emoji distinte)', () => {
    for (let seed = 0; seed < 50; seed++) {
      const deck = makeMemoryDeck(mulberry32(seed));
      const counts = new Map<string, number>();
      for (const card of deck) {
        counts.set(card.emoji, (counts.get(card.emoji) ?? 0) + 1);
      }
      expect(counts.size).toBe(3);
      for (const count of counts.values()) {
        expect(count).toBe(2);
      }
    }
  });

  test('le emoji provengono dal pool animali atteso', () => {
    const pool = ['🐶', '🐱', '🐰', '🦁', '🐸', '🐷', '🐤', '🐠', '🦋', '🐢'];
    const deck = makeMemoryDeck(mulberry32(7));
    for (const card of deck) {
      expect(pool).toContain(card.emoji);
    }
  });

  test('stesso seed ⇒ stesso mazzo (determinismo)', () => {
    const a = makeMemoryDeck(mulberry32(99));
    const b = makeMemoryDeck(mulberry32(99));
    expect(a).toEqual(b);
  });

  test('seed diversi ⇒ ordini/coppie diversi almeno in un caso (shuffle effettivo)', () => {
    const decks = Array.from({ length: 20 }, (_, seed) =>
      makeMemoryDeck(mulberry32(seed))
        .map((c) => c.emoji)
        .join(','),
    );
    expect(new Set(decks).size).toBeGreaterThan(1);
  });
});
