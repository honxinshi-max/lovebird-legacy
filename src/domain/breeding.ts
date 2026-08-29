import { explainInheritance, inheritGenome } from './genetics';
import { calculateAncestry, analyzeRelationship } from './pedigree';
import type {
  RelationshipAnalysis,
} from './pedigree';
import { derivePhenotype } from './phenotype';
import { getCompatibility, RULESET } from './rules';
import { createRandom, mixSeed, stableId } from './random';
import type {
  BandId,
  Bird,
  BirdEvent,
  BirdId,
  BreedingEvent,
  CompatibilityLevel,
  EventId,
  GameState,
  LocusId,
  RiskBand,
  SpeciesId,
} from './types';
import type { InheritanceExplanation } from './genetics';

export type PairingReasonCode =
  | 'sex-pair-invalid'
  | 'same-bird'
  | 'life-stage-invalid'
  | 'health-restricted'
  | 'cooldown-active'
  | 'breeding-limit-reached'
  | 'species-incompatible'
  | 'pedigree-incomplete'
  | 'close-kinship'
  | 'compatibility-limited'
  | 'compatibility-low'
  | 'carrier-risk'
  | 'compatibility-failed';

export interface PairingReason {
  code: PairingReasonCode;
  label: string;
  detail: string;
}

export interface PossibilityBand {
  trait: string;
  label: string;
  band: '常见' | '可能' | '少见';
}

export interface PairAssessment {
  eligible: boolean;
  blockingReasons: readonly PairingReason[];
  warnings: readonly PairingReason[];
  compatibility: CompatibilityLevel;
  relationship: RelationshipAnalysis;
  healthRisk: RiskBand;
  carrierLoci: readonly LocusId[];
  possiblePhenotypes: readonly PossibilityBand[];
}

export interface BreedCommand {
  fatherId: BirdId;
  motherId: BirdId;
  eventId: EventId;
  seed: number;
}

export interface FailedBreedingAttempt extends BirdEvent {
  type: 'breeding-attempted';
}

export type BreedResult =
  | {
      ok: true;
      event: BreedingEvent;
      chicks: readonly [Bird, Bird, Bird];
      explanations: readonly (readonly InheritanceExplanation[])[];
    }
  | {
      ok: false;
      event: FailedBreedingAttempt;
      reasons: readonly PairingReason[];
      chicks: readonly [];
    };

function allBirds(state: GameState): Record<string, Bird> {
  return { ...state.pedigreeBirds, ...state.birds };
}

function reason(
  code: PairingReasonCode,
  label: string,
  detail: string,
): PairingReason {
  return { code, label, detail };
}

function riskAlleles(bird: Bird, locusId: LocusId): boolean {
  const genotype = bird.genome.loci[locusId];
  return genotype.paternal.allele === 'risk' || genotype.maternal.allele === 'risk';
}

function sharedCarrierLoci(father: Bird, mother: Bird): readonly LocusId[] {
  return (Object.keys(RULESET.loci) as LocusId[]).filter((locusId) => {
    const locus = RULESET.loci[locusId];
    return (
      locus.category === 'health' &&
      riskAlleles(father, locusId) &&
      riskAlleles(mother, locusId)
    );
  });
}

function phenotypePossibilities(father: Bird, mother: Bird): readonly PossibilityBand[] {
  const loci: readonly LocusId[] = [
    'baseColor',
    'blueSeries',
    'faceColor',
    'bodyPattern',
    'eyeColor',
    'featherForm',
  ];
  return loci.flatMap((locusId) => {
    const labels = new Set(
      [
        ...Object.values(father.genome.loci[locusId]),
        ...Object.values(mother.genome.loci[locusId]),
      ].map((copy) => RULESET.loci[locusId].alleles[copy.allele]?.label ?? copy.allele),
    );
    return [...labels].map((label, index) => ({
      trait: RULESET.loci[locusId].label,
      label,
      band: index === 0 ? ('常见' as const) : ('可能' as const),
    }));
  });
}

export function assessPairing(
  father: Bird,
  mother: Bird,
  state: GameState,
): PairAssessment {
  const compatibility = getCompatibility(
    father.speciesAtBirth,
    mother.speciesAtBirth,
  );
  const relationship = analyzeRelationship(father, mother, allBirds(state));
  const blockingReasons: PairingReason[] = [];
  const warnings: PairingReason[] = [];

  if (father.birdId === mother.birdId) {
    blockingReasons.push(reason('same-bird', '不能与自身配对', '请选择两只不同的鸟。'));
  }
  if (father.sex !== 'male' || mother.sex !== 'female') {
    blockingReasons.push(
      reason('sex-pair-invalid', '父母本角色不符合', '首版需要选择一只公鸟和一只母鸟。'),
    );
  }
  if (father.status.lifeStage !== 'adult' || mother.status.lifeStage !== 'adult') {
    blockingReasons.push(
      reason('life-stage-invalid', '尚未达到繁育年龄', '两只鸟都必须处于成年阶段。'),
    );
  }
  if (
    ['unwell', 'severe'].includes(father.status.health) ||
    ['unwell', 'severe'].includes(mother.status.health) ||
    !father.status.canBreed ||
    !mother.status.canBreed
  ) {
    blockingReasons.push(
      reason('health-restricted', '当前健康不允许繁育', '健康受限或已禁止繁育。'),
    );
  }
  if (
    father.status.cooldownUntilTurn > state.turn ||
    mother.status.cooldownUntilTurn > state.turn
  ) {
    blockingReasons.push(
      reason('cooldown-active', '繁育冷却中', '需要等待冷却结束后再配对。'),
    );
  }
  if (
    father.status.breedingCount >= father.status.lifetimeBreedingLimit ||
    mother.status.breedingCount >= mother.status.lifetimeBreedingLimit
  ) {
    blockingReasons.push(
      reason('breeding-limit-reached', '已达到一生繁育上限', '该鸟不能继续繁育。'),
    );
  }
  if (compatibility === 'incompatible') {
    blockingReasons.push(
      reason('species-incompatible', '物种不兼容', '当前物种组合不能繁育。'),
    );
  }
  if (!relationship.ancestryComplete) {
    blockingReasons.push(
      reason('pedigree-incomplete', '血统资料不完整', '未知祖先不能被当作无近交风险。'),
    );
  }

  if (
    ['parent-child', 'full-siblings', 'half-siblings', 'grandparent', 'related'].includes(
      relationship.category,
    )
  ) {
    warnings.push(
      reason(
        'close-kinship',
        '存在近亲关系',
        `关系为 ${relationship.category}，隐性风险与体质退化概率提高。`,
      ),
    );
  }
  if (compatibility === 'limited') {
    warnings.push(
      reason('compatibility-limited', '有限兼容', '繁育成功率与遗传稳定度会下降。'),
    );
  }
  if (compatibility === 'low') {
    warnings.push(
      reason('compatibility-low', '低兼容', '繁育成功率明显下降，并增加繁殖力不确定性。'),
    );
  }

  const carrierLoci = sharedCarrierLoci(father, mother);
  if (carrierLoci.length > 0) {
    warnings.push(
      reason('carrier-risk', '共同隐性风险', `双方在 ${carrierLoci.length} 个健康位点携带风险。`),
    );
  }
  const healthRisk: RiskBand =
    carrierLoci.length > 1 || relationship.riskBand === 'critical'
      ? 'critical'
      : carrierLoci.length === 1 || relationship.riskBand === 'high'
        ? 'high'
        : relationship.riskBand === 'guarded'
          ? 'guarded'
          : relationship.riskBand === 'unknown'
            ? 'unknown'
            : 'low';

  return {
    eligible: blockingReasons.length === 0,
    blockingReasons,
    warnings,
    compatibility,
    relationship,
    healthRisk,
    carrierLoci,
    possiblePhenotypes: phenotypePossibilities(father, mother),
  };
}

function primarySpecies(
  ancestry: Record<SpeciesId, number>,
  tieBreaker: SpeciesId,
): SpeciesId {
  const max = Math.max(...Object.values(ancestry));
  const candidates = (Object.keys(ancestry) as SpeciesId[]).filter(
    (species) => ancestry[species] === max,
  );
  return candidates.includes(tieBreaker) ? tieBreaker : (candidates[0] as SpeciesId);
}

function createChick(
  father: Bird,
  mother: Bird,
  command: BreedCommand,
  index: number,
): Bird {
  const random = createRandom(mixSeed(command.seed, command.eventId, index));
  const genome = inheritGenome(father, mother, random);
  const ancestryComposition = calculateAncestry(father, mother);
  const id = stableId('BIRD', command.eventId, index) as BirdId;
  const draft: Bird = {
    birdId: id,
    bandId: stableId('LW-2026', command.eventId, index) as BandId,
    sex: random.chance(0.5) ? 'male' : 'female',
    birthDate: '2026-08-29',
    birthPlayerId: 'PLAYER-DEMO',
    fatherId: father.birdId,
    motherId: mother.birdId,
    speciesAtBirth: primarySpecies(ancestryComposition, father.speciesAtBirth),
    genome,
    ancestryComposition,
    rulesetVersion: RULESET.version,
    generation: Math.max(father.generation, mother.generation) + 1,
    knownLoci: ['baseColor', 'faceColor', 'bodyPattern', 'eyeColor'],
    status: {
      name: `幼鸟 ${index + 1}`,
      ownerPlayerId: 'PLAYER-DEMO',
      health: 'healthy',
      lifeStage: 'chick',
      canBreed: false,
      breedingCount: 0,
      lifetimeBreedingLimit: 6,
      cooldownUntilTurn: 0,
    },
  };
  const findings = derivePhenotype(draft).healthFindings;
  draft.status.health = findings.some((finding) => finding.severity === 'severe')
    ? 'severe'
    : findings.length > 0
      ? 'watch'
      : 'healthy';
  return draft;
}

function failedAttempt(
  command: BreedCommand,
  state: GameState,
  reasons: readonly PairingReason[],
): BreedResult {
  return {
    ok: false,
    event: {
      eventId: command.eventId,
      type: 'breeding-attempted',
      turn: state.turn,
      birdIds: [command.fatherId, command.motherId],
      payload: { reasons: reasons.map((item) => item.code), seed: command.seed },
    },
    reasons,
    chicks: [],
  };
}

export function breedClutch(command: BreedCommand, state: GameState): BreedResult {
  const father = state.birds[command.fatherId];
  const mother = state.birds[command.motherId];
  if (!father || !mother) {
    return failedAttempt(command, state, [
      reason('pedigree-incomplete', '找不到父母本', '繁育命令引用了不存在的鸟。'),
    ]);
  }

  const assessment = assessPairing(father, mother, state);
  if (!assessment.eligible) {
    return failedAttempt(command, state, assessment.blockingReasons);
  }

  const successProbability: Record<CompatibilityLevel, number> = {
    high: 1,
    limited: 0.88,
    low: 0.62,
    incompatible: 0,
  };
  const attemptRandom = createRandom(mixSeed(command.seed, command.eventId, 'compatibility'));
  if (!attemptRandom.chance(successProbability[assessment.compatibility])) {
    return failedAttempt(command, state, [
      reason('compatibility-failed', '本次繁育未成功', '兼容程度较低，本次没有形成幼鸟。'),
    ]);
  }

  const chicks = [0, 1, 2].map((index) =>
    createChick(father, mother, command, index),
  ) as [Bird, Bird, Bird];
  const explanations = chicks.map((chick) =>
    explainInheritance(chick, father, mother),
  );
  const resultDigest = stableId(
    'HASH',
    command.eventId,
    JSON.stringify(
      chicks.map((chick) => ({
        id: chick.birdId,
        genome: chick.genome,
        ancestry: chick.ancestryComposition,
      })),
    ),
  );
  const event: BreedingEvent = {
    eventId: command.eventId,
    fatherId: father.birdId,
    motherId: mother.birdId,
    seed: command.seed,
    rulesetVersion: RULESET.version,
    childIds: chicks.map((chick) => chick.birdId),
    resultDigest,
    generation: Math.max(...chicks.map((chick) => chick.generation)),
  };

  return { ok: true, event, chicks, explanations };
}
