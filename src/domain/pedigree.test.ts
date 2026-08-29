import { describe, expect, it } from 'vitest';

import { createDemoState } from '../fixtures/seedBirds';
import type { Bird, BirdId } from './types';
import { analyzeRelationship, calculateAncestry } from './pedigree';

function asId(value: string): BirdId {
  return value as BirdId;
}

function clonedBird(source: Bird, id: string, fatherId?: string, motherId?: string): Bird {
  return {
    ...structuredClone(source),
    birdId: asId(id),
    bandId: `RING-${id}` as Bird['bandId'],
    fatherId: fatherId ? asId(fatherId) : undefined,
    motherId: motherId ? asId(motherId) : undefined,
    status: { ...source.status, name: id },
  };
}

function allBirds(): Record<string, Bird> {
  const state = createDemoState();
  return { ...state.pedigreeBirds, ...state.birds };
}

describe('pedigree relationship analysis', () => {
  it.each([
    ['parent-child', 'REL-PARENT', 'REL-CHILD'],
    ['full-siblings', 'REL-FULL-A', 'REL-FULL-B'],
    ['half-siblings', 'REL-HALF-A', 'REL-HALF-B'],
    ['grandparent', 'REL-GRAND', 'REL-GRANDCHILD'],
  ] as const)('classifies %s symmetrically', (category, firstId, secondId) => {
    const base = createDemoState().birds['BIRD-M-001'] as Bird;
    const birds = allBirds();
    birds['REL-PARENT'] = clonedBird(base, 'REL-PARENT');
    birds['REL-OTHER'] = clonedBird(base, 'REL-OTHER');
    birds['REL-CHILD'] = clonedBird(base, 'REL-CHILD', 'REL-PARENT', 'REL-OTHER');
    birds['REL-FULL-A'] = clonedBird(base, 'REL-FULL-A', 'PF-A1', 'PF-A2');
    birds['REL-FULL-B'] = clonedBird(base, 'REL-FULL-B', 'PF-A1', 'PF-A2');
    birds['REL-HALF-A'] = clonedBird(base, 'REL-HALF-A', 'PF-A1', 'PF-A2');
    birds['REL-HALF-B'] = clonedBird(base, 'REL-HALF-B', 'PF-A1', 'PF-A4');
    birds['REL-GRAND'] = clonedBird(base, 'REL-GRAND');
    birds['REL-MID'] = clonedBird(base, 'REL-MID', 'REL-GRAND', 'REL-OTHER');
    birds['REL-GRANDCHILD'] = clonedBird(base, 'REL-GRANDCHILD', 'REL-MID', 'PF-A2');

    const forward = analyzeRelationship(birds[firstId] as Bird, birds[secondId] as Bird, birds);
    const backward = analyzeRelationship(birds[secondId] as Bird, birds[firstId] as Bird, birds);

    expect(forward.category).toBe(category);
    expect(backward).toEqual(forward);
  });

  it('does not treat a missing ancestor as unrelated', () => {
    const birds = allBirds();
    const first = structuredClone(birds['BIRD-M-001']) as Bird;
    first.fatherId = asId('MISSING-ANCESTOR');
    birds[first.birdId] = first;

    expect(
      analyzeRelationship(first, birds['BIRD-F-002'] as Bird, birds).category,
    ).toBe('risk-unknown');
  });

  it('merges parent ancestry to exactly one hundred percent', () => {
    const birds = createDemoState().birds;
    const ancestry = calculateAncestry(
      birds['BIRD-M-001'] as Bird,
      birds['BIRD-F-002'] as Bird,
    );

    expect(ancestry).toEqual({ peachFaced: 50, fischers: 50, masked: 0 });
    expect(Object.values(ancestry).reduce((sum, value) => sum + value, 0)).toBe(100);
  });
});
