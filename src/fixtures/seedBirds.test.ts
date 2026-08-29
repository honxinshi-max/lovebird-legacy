import { describe, expect, it } from 'vitest';

import { RULESET } from '../domain/rules';
import { createDemoState } from './seedBirds';

describe('seed flock', () => {
  it('creates six eligible adults with immutable identity', () => {
    const state = createDemoState();
    const birds = Object.values(state.birds);

    expect(birds).toHaveLength(6);
    expect(new Set(birds.map((bird) => bird.birdId)).size).toBe(6);
    expect(new Set(birds.map((bird) => bird.bandId)).size).toBe(6);
    expect(birds.every((bird) => bird.status.canBreed)).toBe(true);
    expect(birds.every((bird) => bird.status.lifeStage === 'adult')).toBe(true);
  });

  it('balances species and sexes while retaining explicit trade-offs', () => {
    const birds = Object.values(createDemoState().birds);
    const speciesCounts = birds.reduce<Record<string, number>>((counts, bird) => {
      counts[bird.speciesAtBirth] = (counts[bird.speciesAtBirth] ?? 0) + 1;
      return counts;
    }, {});

    expect(Object.values(speciesCounts)).toEqual([2, 2, 2]);
    expect(birds.filter((bird) => bird.sex === 'male')).toHaveLength(3);
    expect(birds.filter((bird) => bird.sex === 'female')).toHaveLength(3);
  });

  it('references only configured loci and alleles', () => {
    const allBirds = [
      ...Object.values(createDemoState().birds),
      ...Object.values(createDemoState().pedigreeBirds),
    ];

    for (const bird of allBirds) {
      expect(Object.keys(bird.genome.loci)).toHaveLength(12);
      for (const [locusId, genotype] of Object.entries(bird.genome.loci)) {
        const locus = RULESET.loci[locusId as keyof typeof RULESET.loci];
        expect(locus.alleles).toHaveProperty(genotype.paternal.allele);
        expect(locus.alleles).toHaveProperty(genotype.maternal.allele);
      }
    }
  });
});
