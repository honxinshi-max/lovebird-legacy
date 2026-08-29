import { describe, expect, it } from 'vitest';

import { createDemoState } from '../fixtures/seedBirds';
import type { Bird, BirdId } from './types';
import { inheritGenome } from './genetics';
import { derivePhenotype, derivePotential } from './phenotype';
import { createRandom } from './random';

function makeChild(father: Bird, mother: Bird, seed: number): Bird {
  return {
    ...father,
    birdId: `CHILD-${seed}` as BirdId,
    fatherId: father.birdId,
    motherId: mother.birdId,
    genome: inheritGenome(father, mother, createRandom(seed)),
    status: { ...father.status, name: `幼鸟 ${seed}` },
  };
}

describe('genotype-derived phenotype and potential', () => {
  it('maps configured alleles to bounded appearance parameters', () => {
    const [first, second] = Object.values(createDemoState().birds) as [Bird, Bird];
    const a = derivePhenotype(first);
    const b = derivePhenotype(second);

    expect(a.bodyColorToken).toMatch(/^(green|olive|cinnamon|aqua|blue)$/);
    expect(a.bodyScale).toBeGreaterThanOrEqual(0.86);
    expect(a.bodyScale).toBeLessThanOrEqual(1.14);
    expect(a).not.toEqual(b);
  });

  it('exposes strengths with explicit opportunity costs and no total score', () => {
    const bird = createDemoState().birds['BIRD-M-001'] as Bird;
    const potential = derivePotential(bird);

    expect(potential.performance.speed).toBeGreaterThan(potential.performance.endurance);
    expect(potential.tradeOffs.length).toBeGreaterThan(0);
    expect(potential).not.toHaveProperty('overallScore');
  });

  it('never generates a bird in the top band for every dimension', () => {
    const state = createDemoState();
    const father = state.birds['BIRD-M-001'] as Bird;
    const mother = state.birds['BIRD-F-001'] as Bird;

    for (let seed = 0; seed < 10_000; seed += 1) {
      const values = Object.values(derivePotential(makeChild(father, mother, seed)).allTraits);
      expect(values.every((value) => value >= 90)).toBe(false);
    }
  });

  it('marks homozygous severe health risk as a restriction, never a reward', () => {
    const bird = structuredClone(createDemoState().birds['BIRD-M-003']) as Bird;
    bird.genome.loci.skeletalRisk.paternal.allele = 'risk';
    bird.genome.loci.skeletalRisk.maternal.allele = 'risk';

    const result = derivePhenotype(bird);

    expect(result.healthFindings).toContainEqual(
      expect.objectContaining({ severity: 'severe', positiveReward: false }),
    );
  });
});
