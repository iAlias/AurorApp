import { render } from '@testing-library/react';
import { Rainbow } from '../../src/ui/Rainbow';

// Task 16 (M5): componente puro/statico che disegna l'arcobaleno del timer
// pasto (§8.2). Nessuna animazione propria: `progress` guida solo il
// riempimento degli archi (via `fillFraction`, Task 15) e la posizione del
// sole (via `sunAngleDeg`, Task 15) — entrambe importate, non ricalcolate.

function renderRainbow(progress: number) {
  const { container } = render(<Rainbow progress={progress} />);
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('svg non trovato');
  return svg;
}

function arcOffsets(svg: SVGElement): number[] {
  const fills = Array.from(svg.querySelectorAll('[data-testid^="arc-fill-"]'));
  return fills.map((el) => Number(el.getAttribute('stroke-dashoffset')));
}

function sunPosition(svg: SVGElement): { x: number; y: number } {
  const sun = svg.querySelector('[data-testid="sun"]');
  if (!sun) throw new Error('sole non trovato');
  const transform = sun.getAttribute('transform') ?? '';
  const match = /translate\(\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)\s*\)/.exec(transform);
  if (!match) throw new Error(`transform inatteso: ${transform}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

describe('Rainbow', () => {
  test('a progress 0 tutti gli archi hanno strokeDashoffset≈1', () => {
    const svg = renderRainbow(0);
    const offsets = arcOffsets(svg);
    expect(offsets).toHaveLength(7);
    offsets.forEach((o) => expect(o).toBeCloseTo(1));
  });

  test('a progress 0.5 gli archi 0-2 sono pieni, il 3 a meta, i 4-6 vuoti', () => {
    const svg = renderRainbow(0.5);
    const offsets = arcOffsets(svg);

    expect(offsets[0]).toBeCloseTo(0);
    expect(offsets[1]).toBeCloseTo(0);
    expect(offsets[2]).toBeCloseTo(0);
    expect(offsets[3]).toBeCloseTo(0.5);
    expect(offsets[4]).toBeCloseTo(1);
    expect(offsets[5]).toBeCloseTo(1);
    expect(offsets[6]).toBeCloseTo(1);
  });

  test('a progress 1 tutti gli archi sono pieni (offset 0)', () => {
    const svg = renderRainbow(1);
    const offsets = arcOffsets(svg);
    offsets.forEach((o) => expect(o).toBeCloseTo(0));
  });

  test('il sole e a sinistra del centro a progress 0', () => {
    const svg = renderRainbow(0);
    const { x } = sunPosition(svg);
    expect(x).toBeLessThan(500);
  });

  test('il sole e a destra del centro a progress 1', () => {
    const svg = renderRainbow(1);
    const { x } = sunPosition(svg);
    expect(x).toBeGreaterThan(500);
  });

  test('markup: 14 archi (7 grigi + 7 colorati)', () => {
    const svg = renderRainbow(0.3);
    const arcs = svg.querySelectorAll('[data-testid="arcs"] path');
    expect(arcs).toHaveLength(14);
  });
});
