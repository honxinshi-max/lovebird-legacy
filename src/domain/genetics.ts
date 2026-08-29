import { RULESET, getLocus } from './rules';
import type {
  AlleleCopy,
  Bird,
  Genome,
  LocusGenotype,
  LocusId,
  PerformanceTrait,
  PolygenicUnit,
  TemperamentTrait,
} from './types';
import type { SeededRandom } from './random';

type ParentSide = 'paternal' | 'maternal';

export interface InheritanceExplanation {
  locusId: LocusId;
  label: string;
  expressedLabels: readonly string[];
  text: string;
}

const colorBlock = new Set<LocusId>([
  'baseColor',
  'dilution',
  'blueSeries',
  'faceColor',
]);

function chooseSide(random: SeededRandom): ParentSide {
  return random.chance(0.5) ? 'paternal' : 'maternal';
}

function inheritCopy(
  source: Bird,
  locusId: LocusId,
  parent: 'father' | 'mother',
  random: SeededRandom,
  stableSide?: ParentSide,
): AlleleCopy {
  const side = stableSide ?? chooseSide(random);
  const inherited = source.genome.loci[locusId][side];
  const definition = getLocus(locusId);

  if (random.chance(definition.mutationRate)) {
    const alternatives = Object.keys(definition.alleles).filter(
      (allele) => allele !== inherited.allele,
    );
    return {
      allele: random.pick(alternatives),
      origin: 'mutation',
      sourceBirdId: source.birdId,
      mutatedFrom: inherited.allele,
    };
  }

  return {
    allele: inherited.allele,
    origin: parent,
    sourceBirdId: source.birdId,
  };
}

function inheritPolygenicUnits(
  fatherUnits: readonly PolygenicUnit[],
  motherUnits: readonly PolygenicUnit[],
  random: SeededRandom,
  stability: number,
): readonly PolygenicUnit[] {
  const keepFatherBlock = random.chance(stability);
  const keepMotherBlock = random.chance(stability);
  const fatherSide = chooseSide(random);
  const motherSide = chooseSide(random);

  return fatherUnits.map((fatherUnit, index) => {
    const motherUnit = motherUnits[index] ?? motherUnits[0];
    if (!motherUnit) {
      throw new Error('POLYGENIC_UNIT_MISSING');
    }

    const selectedFatherSide = keepFatherBlock ? fatherSide : chooseSide(random);
    const selectedMotherSide = keepMotherBlock ? motherSide : chooseSide(random);
    return {
      paternal: fatherUnit[selectedFatherSide],
      maternal: motherUnit[selectedMotherSide],
    };
  });
}

export function inheritGenome(
  father: Bird,
  mother: Bird,
  random: SeededRandom,
): Genome {
  const colorStability =
    (RULESET.species[father.speciesAtBirth].stability.color +
      RULESET.species[mother.speciesAtBirth].stability.color) /
    2;
  const preserveFatherColor = random.chance(colorStability);
  const preserveMotherColor = random.chance(colorStability);
  const fatherColorSide = chooseSide(random);
  const motherColorSide = chooseSide(random);

  const loci = Object.fromEntries(
    (Object.keys(RULESET.loci) as LocusId[]).map((locusId) => {
      const stableFatherSide =
        colorBlock.has(locusId) && preserveFatherColor ? fatherColorSide : undefined;
      const stableMotherSide =
        colorBlock.has(locusId) && preserveMotherColor ? motherColorSide : undefined;
      const genotype: LocusGenotype = {
        paternal: inheritCopy(
          father,
          locusId,
          'father',
          random,
          stableFatherSide,
        ),
        maternal: inheritCopy(
          mother,
          locusId,
          'mother',
          random,
          stableMotherSide,
        ),
      };
      return [locusId, genotype];
    }),
  ) as Record<LocusId, LocusGenotype>;

  const flightStability =
    (RULESET.species[father.speciesAtBirth].stability.flight +
      RULESET.species[mother.speciesAtBirth].stability.flight) /
    2;
  const temperamentStability =
    (RULESET.species[father.speciesAtBirth].stability.temperament +
      RULESET.species[mother.speciesAtBirth].stability.temperament) /
    2;

  const performance = Object.fromEntries(
    RULESET.performanceTraits.map((trait) => [
      trait,
      inheritPolygenicUnits(
        father.genome.performance[trait],
        mother.genome.performance[trait],
        random,
        flightStability,
      ),
    ]),
  ) as Record<PerformanceTrait, readonly PolygenicUnit[]>;
  const temperament = Object.fromEntries(
    RULESET.temperamentTraits.map((trait) => [
      trait,
      inheritPolygenicUnits(
        father.genome.temperament[trait],
        mother.genome.temperament[trait],
        random,
        temperamentStability,
      ),
    ]),
  ) as Record<TemperamentTrait, readonly PolygenicUnit[]>;

  return { loci, performance, temperament };
}

export function expressedAlleles(
  locusId: LocusId,
  genotype: LocusGenotype,
): readonly string[] {
  const definition = getLocus(locusId);
  const first = genotype.paternal.allele;
  const second = genotype.maternal.allele;

  if (first === second) {
    return [first];
  }
  if (definition.expression === 'codominant') {
    return [first, second];
  }

  const firstDominance = definition.alleles[first]?.dominance ?? 0;
  const secondDominance = definition.alleles[second]?.dominance ?? 0;
  return [firstDominance >= secondDominance ? first : second];
}

function copyPhrase(copy: AlleleCopy, parentName: string): string {
  const mutation = copy.origin === 'mutation' ? `发生由${copy.mutatedFrom ?? '未知'}而来的突变` : '获得';
  return `从${parentName}${mutation}“${copy.allele}”`;
}

export function explainInheritance(
  child: Bird,
  father: Bird,
  mother: Bird,
): readonly InheritanceExplanation[] {
  return (Object.keys(RULESET.loci) as LocusId[]).map((locusId) => {
    const definition = getLocus(locusId);
    const genotype = child.genome.loci[locusId];
    const expressed = expressedAlleles(locusId, genotype);
    const expressedLabels = expressed.map(
      (allele) => definition.alleles[allele]?.label ?? allele,
    );
    return {
      locusId,
      label: definition.label,
      expressedLabels,
      text: `${definition.label}：${copyPhrase(genotype.paternal, father.status.name)}，${copyPhrase(genotype.maternal, mother.status.name)}；表现为${expressedLabels.join('与')}。`,
    };
  });
}
