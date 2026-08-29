import { expressedAlleles } from './genetics';
import { RULESET, getLocus } from './rules';
import type {
  Bird,
  LocusId,
  PerformanceTrait,
  TemperamentTrait,
} from './types';

export type PotentialBand = '有限' | '普通' | '良好' | '突出' | '卓越';

export interface TradeOffExplanation {
  axis: 'burst-energy' | 'flight-form' | 'neural-response' | 'social-attachment';
  source: string;
  effects: readonly string[];
  text: string;
}

export interface HealthFinding {
  locusId: LocusId;
  label: string;
  severity: 'watch' | 'severe';
  positiveReward: false;
}

export interface PhenotypeProfile {
  bodyColorToken: 'green' | 'olive' | 'cinnamon' | 'aqua' | 'blue';
  faceColorToken: 'coral' | 'amber' | 'ivory';
  pattern: 'even' | 'pied' | 'edged';
  eyeColorToken: 'ink' | 'ruby';
  faceShape: 'round' | 'wedge' | 'mixed';
  featherForm: 'standard' | 'longTail';
  bodyScale: number;
  tailScale: number;
  healthFindings: readonly HealthFinding[];
}

export interface PotentialProfile {
  performance: Record<PerformanceTrait, number>;
  temperament: Record<TemperamentTrait, number>;
  allTraits: Record<PerformanceTrait | TemperamentTrait, number>;
  bands: Record<PerformanceTrait | TemperamentTrait, PotentialBand>;
  tradeOffs: readonly TradeOffExplanation[];
}

function isHomozygous(bird: Bird, locusId: LocusId, allele: string): boolean {
  const genotype = bird.genome.loci[locusId];
  return genotype.paternal.allele === allele && genotype.maternal.allele === allele;
}

function firstExpressed(bird: Bird, locusId: LocusId): string {
  return expressedAlleles(locusId, bird.genome.loci[locusId])[0] ?? '';
}

function healthFindings(bird: Bird): readonly HealthFinding[] {
  return (Object.keys(RULESET.loci) as LocusId[]).flatMap((locusId) => {
    const locus = getLocus(locusId);
    if (locus.category !== 'health' || !isHomozygous(bird, locusId, 'risk')) {
      return [];
    }
    const severity = locus.alleles.risk?.healthSeverity;
    return [
      {
        locusId,
        label: locus.label,
        severity: severity === 'severe' ? 'severe' : 'watch',
        positiveReward: false as const,
      },
    ];
  });
}

export function derivePhenotype(bird: Bird): PhenotypeProfile {
  const blue = firstExpressed(bird, 'blueSeries');
  const base = firstExpressed(bird, 'baseColor');
  const bodyColorToken =
    blue === 'blue' || blue === 'aqua'
      ? blue
      : base === 'olive' || base === 'cinnamon'
        ? base
        : 'green';
  const face = firstExpressed(bird, 'faceColor');
  const faceColorToken =
    face === 'amber' || face === 'ivory' ? face : 'coral';
  const wingPattern = firstExpressed(bird, 'wingPattern');
  const bodyPattern = expressedAlleles(
    'bodyPattern',
    bird.genome.loci.bodyPattern,
  );
  const pattern = wingPattern === 'edged' ? 'edged' : bodyPattern.includes('pied') ? 'pied' : 'even';
  const faceShapes = expressedAlleles('faceShape', bird.genome.loci.faceShape);
  const faceShape =
    faceShapes.length > 1 ? 'mixed' : faceShapes[0] === 'wedge' ? 'wedge' : 'round';
  const featherForm = isHomozygous(bird, 'featherForm', 'longTail')
    ? 'longTail'
    : 'standard';

  return {
    bodyColorToken,
    faceColorToken,
    pattern,
    eyeColorToken: isHomozygous(bird, 'eyeColor', 'ruby') ? 'ruby' : 'ink',
    faceShape,
    featherForm,
    bodyScale: faceShape === 'round' ? 1.04 : faceShape === 'wedge' ? 0.96 : 1,
    tailScale: featherForm === 'longTail' ? 1.16 : 1,
    healthFindings: healthFindings(bird),
  };
}

function averageUnits(
  units: readonly { paternal: number; maternal: number }[],
): number {
  const values = units.flatMap((unit) => [unit.paternal, unit.maternal]);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number): number {
  return Math.round(Math.max(5, Math.min(95, value)));
}

function band(value: number): PotentialBand {
  if (value >= 86) return '卓越';
  if (value >= 72) return '突出';
  if (value >= 56) return '良好';
  if (value >= 38) return '普通';
  return '有限';
}

export function derivePotential(bird: Bird): PotentialProfile {
  const species = RULESET.species[bird.speciesAtBirth];
  const performance = Object.fromEntries(
    RULESET.performanceTraits.map((trait) => [
      trait,
      averageUnits(bird.genome.performance[trait]) + species.basePotential[trait] - 50,
    ]),
  ) as Record<PerformanceTrait, number>;
  const temperament = Object.fromEntries(
    RULESET.temperamentTraits.map((trait) => [
      trait,
      averageUnits(bird.genome.temperament[trait]) + species.basePotential[trait] - 50,
    ]),
  ) as Record<TemperamentTrait, number>;
  const tradeOffs: TradeOffExplanation[] = [];

  const burstPressure = performance.speed + performance.burst - 125;
  if (burstPressure > 0) {
    const cost = burstPressure * 0.36;
    performance.endurance -= cost;
    tradeOffs.push({
      axis: 'burst-energy',
      source: '速度与爆发能量分配',
      effects: ['速度提高', '爆发提高', `耐力约降低 ${Math.round(cost)} 点`],
      text: '更强的瞬时输出占用了持续飞行的能量余量。',
    });
  }

  const phenotype = derivePhenotype(bird);
  if (phenotype.featherForm === 'longTail') {
    performance.agility -= 8;
    performance.endurance -= 4;
    tradeOffs.push({
      axis: 'flight-form',
      source: '长尾羽型',
      effects: ['外貌辨识度提高', '灵活降低 8 点', '耐力降低 4 点'],
      text: '更长的尾羽带来展示价值，也增加转向和持续飞行负担。',
    });
  }

  const alertnessPressure = temperament.alertness - 62;
  if (alertnessPressure > 0) {
    const cost = alertnessPressure * 0.5;
    temperament.docility -= cost;
    tradeOffs.push({
      axis: 'neural-response',
      source: '高警觉反应',
      effects: ['竞技反应提高', `乖巧约降低 ${Math.round(cost)} 点`],
      text: '敏锐警觉有利于即时反应，却增加手养和陌生环境适应成本。',
    });
  }

  const attachmentPressure = temperament.docility + temperament.affinity - 126;
  if (attachmentPressure > 0) {
    const cost = attachmentPressure * 0.28;
    temperament.courage -= cost;
    tradeOffs.push({
      axis: 'social-attachment',
      source: '高度社会依附',
      effects: ['亲和提高', `独立胆量约降低 ${Math.round(cost)} 点`],
      text: '强烈依附让手养更顺利，但不会同时获得最高的独立探索倾向。',
    });
  }

  for (const trait of RULESET.performanceTraits) {
    performance[trait] = clamp(performance[trait]);
  }
  for (const trait of RULESET.temperamentTraits) {
    temperament[trait] = clamp(temperament[trait]);
  }

  const allTraits = { ...performance, ...temperament };
  const bands = Object.fromEntries(
    Object.entries(allTraits).map(([trait, value]) => [trait, band(value)]),
  ) as Record<PerformanceTrait | TemperamentTrait, PotentialBand>;

  return { performance, temperament, allTraits, bands, tradeOffs };
}
