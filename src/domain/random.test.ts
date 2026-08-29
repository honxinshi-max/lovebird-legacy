import { describe, expect, it } from 'vitest';

import { createRandom, mixSeed, stableId } from './random';

describe('deterministic random contract', () => {
  it('replays the same sequence and stable identifiers', () => {
    const seed = mixSeed('save-demo', 'BIRD-M-001', 'BIRD-F-001', 'breed-1');
    const a = createRandom(seed);
    const b = createRandom(seed);

    expect([a.next(), a.nextInt(0, 99), a.pick(['a', 'b', 'c'])]).toEqual([
      b.next(),
      b.nextInt(0, 99),
      b.pick(['a', 'b', 'c']),
    ]);
    expect(stableId('EVT', seed, 0)).toBe(stableId('EVT', seed, 0));
  });

  it('keeps integers inside inclusive bounds', () => {
    const random = createRandom(42);
    const values = Array.from({ length: 1_000 }, () => random.nextInt(3, 7));

    expect(Math.min(...values)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...values)).toBeLessThanOrEqual(7);
    expect(new Set(values)).toEqual(new Set([3, 4, 5, 6, 7]));
  });
});
