import { makeShadowRound, SHADOW_ITEMS } from '../../../src/core/games/shadowRound';
import { makeHabitatRound, HABITATS, HABITAT_ANIMALS } from '../../../src/core/games/habitatRound';
import { makeEmotionRound, EMOTIONS } from '../../../src/core/games/emotionRound';
import { makeBubbleRound } from '../../../src/core/games/bubbleRound';
import { mulberry32 } from '../../../src/core/planner/rng';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

describe('makeShadowRound / makeEmotionRound', () => {
  test.each([
    ['ombre', makeShadowRound, SHADOW_ITEMS.length],
    ['emozioni', makeEmotionRound, EMOTIONS.length],
  ] as const)('%s: 3 opzioni distinte e il target è tra queste', (_, make, poolSize) => {
    expect(poolSize).toBeGreaterThanOrEqual(6);
    for (const seed of SEEDS) {
      const round = make(mulberry32(seed));
      expect(new Set(round.options.map((o) => o.id)).size).toBe(3);
      expect(round.options).toContain(round.target);
    }
  });

  test('stesso seed ⇒ stesso round', () => {
    expect(makeShadowRound(mulberry32(7))).toEqual(makeShadowRound(mulberry32(7)));
    expect(makeEmotionRound(mulberry32(7))).toEqual(makeEmotionRound(mulberry32(7)));
  });
});

describe('makeHabitatRound', () => {
  test('offre sempre le 3 case e l\'animale viene dal catalogo', () => {
    for (const seed of SEEDS) {
      const round = makeHabitatRound(mulberry32(seed));
      expect(round.options.map((h) => h.id).sort()).toEqual(HABITATS.map((h) => h.id).sort());
      expect(HABITAT_ANIMALS).toContain(round.animal);
    }
  });

  test('ogni casa ha almeno 3 animali', () => {
    for (const h of HABITATS) {
      expect(HABITAT_ANIMALS.filter((a) => a.home === h.id).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('makeBubbleRound', () => {
  test('3–6 bolle grandi, dentro l\'area e mai sovrapposte', () => {
    // Area di riferimento: la più stretta prevista (360×400px).
    const W = 360;
    const H = 400;
    for (const seed of SEEDS) {
      const bubbles = makeBubbleRound(mulberry32(seed));
      expect(bubbles.length).toBeGreaterThanOrEqual(3);
      expect(bubbles.length).toBeLessThanOrEqual(6);
      for (const b of bubbles) {
        expect(b.size).toBeGreaterThanOrEqual(64);
        expect((b.x / 100) * W - b.size / 2).toBeGreaterThanOrEqual(0);
        expect((b.x / 100) * W + b.size / 2).toBeLessThanOrEqual(W);
        expect((b.y / 100) * H - b.size / 2).toBeGreaterThanOrEqual(0);
        expect((b.y / 100) * H + b.size / 2).toBeLessThanOrEqual(H);
      }
      for (const a of bubbles) {
        for (const b of bubbles) {
          if (a.id >= b.id) continue;
          const dist = Math.hypot(((a.x - b.x) / 100) * W, ((a.y - b.y) / 100) * H);
          expect(dist).toBeGreaterThanOrEqual((a.size + b.size) / 2);
        }
      }
    }
  });
});
