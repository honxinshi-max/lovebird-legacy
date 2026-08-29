import { describe, expect, it } from 'vitest';

import { RULESET, getCompatibility, getLocus } from './rules';

describe('versioned lovebird rules', () => {
  it('contains the promised first-slice content', () => {
    expect(Object.keys(RULESET.species)).toHaveLength(3);
    expect(Object.keys(RULESET.loci)).toHaveLength(12);
    expect(RULESET.performanceTraits).toHaveLength(6);
    expect(RULESET.temperamentTraits).toHaveLength(5);
  });

  it('keeps compatibility symmetric and supports all four levels', () => {
    expect(getCompatibility('fischers', 'masked')).toBe('limited');
    expect(getCompatibility('masked', 'fischers')).toBe('limited');
    expect(getCompatibility('peachFaced', 'fischers')).toBe('low');
    expect(getCompatibility('peachFaced', 'peachFaced')).toBe('high');
    expect(RULESET.compatibilityLevels).toContain('incompatible');
  });

  it('defines complete allele expression and health metadata', () => {
    for (const locusId of Object.keys(RULESET.loci)) {
      const locus = getLocus(locusId as keyof typeof RULESET.loci);
      expect(Object.keys(locus.alleles).length).toBeGreaterThanOrEqual(2);
      expect(locus.mutationRate).toBeGreaterThanOrEqual(0);
      expect(locus.mutationRate).toBeLessThan(0.01);
      if (locus.category === 'health') {
        expect(locus.positiveReward).toBe(false);
      }
    }
  });
});
