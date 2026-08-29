import { describe, expect, it } from 'vitest';

import { createDemoState } from '../fixtures/seedBirds';
import type { Bird, BirdId, LocusId } from './types';
import { inheritGenome, explainInheritance } from './genetics';
import { createRandom } from './random';

function pair() {
  const state = createDemoState();
  return {
    father: state.birds['BIRD-M-001'] as Bird,
    mother: state.birds['BIRD-F-002'] as Bird,
  };
}

describe('genetic inheritance', () => {
  it('replays exactly from the same parents and seed', () => {
    const { father, mother } = pair();

    expect(inheritGenome(father, mother, createRandom(741))).toEqual(
      inheritGenome(father, mother, createRandom(741)),
    );
  });

  it('attributes every allele to a parent or explicit mutation', () => {
    const { father, mother } = pair();
    const genome = inheritGenome(father, mother, createRandom(741));

    for (const [rawLocusId, genotype] of Object.entries(genome.loci)) {
      const locusId = rawLocusId as LocusId;
      const fatherAlleles = Object.values(father.genome.loci[locusId]).map(
        (copy) => copy.allele,
      );
      const motherAlleles = Object.values(mother.genome.loci[locusId]).map(
        (copy) => copy.allele,
      );

      expect(['father', 'mutation']).toContain(genotype.paternal.origin);
      expect(['mother', 'mutation']).toContain(genotype.maternal.origin);
      if (genotype.paternal.origin !== 'mutation') {
        expect(fatherAlleles).toContain(genotype.paternal.allele);
        expect(genotype.paternal.sourceBirdId).toBe(father.birdId);
      }
      if (genotype.maternal.origin !== 'mutation') {
        expect(motherAlleles).toContain(genotype.maternal.allele);
        expect(genotype.maternal.sourceBirdId).toBe(mother.birdId);
      }
    }
  });

  it('explains expressed inheritance using concrete parent names', () => {
    const { father, mother } = pair();
    const child: Bird = {
      ...father,
      birdId: 'CHILD-TEST' as BirdId,
      fatherId: father.birdId,
      motherId: mother.birdId,
      genome: inheritGenome(father, mother, createRandom(19)),
      status: { ...father.status, name: '测试幼鸟' },
    };

    const explanations = explainInheritance(child, father, mother);

    expect(explanations).toHaveLength(12);
    expect(explanations[0]?.text).toContain(father.status.name);
    expect(explanations[0]?.text).toContain(mother.status.name);
    expect(explanations.every((item) => !item.text.includes('随机获得'))).toBe(true);
  });
});
