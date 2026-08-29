import { RULESET } from '../domain/rules';
import type {
  AlleleCopy,
  BandId,
  Bird,
  BirdId,
  GameState,
  Genome,
  LocusGenotype,
  LocusId,
  PerformanceTrait,
  PolygenicUnit,
  Sex,
  SpeciesId,
  TemperamentTrait,
} from '../domain/types';

type TraitProfile = Partial<Record<PerformanceTrait | TemperamentTrait, number>>;
type LocusOverrides = Partial<Record<LocusId, readonly [string, string]>>;

const birdId = (value: string) => value as BirdId;
const bandId = (value: string) => value as BandId;

const defaultAlleles: Record<LocusId, readonly [string, string]> = {
  baseColor: ['wild', 'wild'],
  dilution: ['full', 'full'],
  blueSeries: ['green', 'green'],
  faceColor: ['coral', 'coral'],
  wingPattern: ['solid', 'solid'],
  bodyPattern: ['even', 'even'],
  eyeColor: ['dark', 'dark'],
  faceShape: ['round', 'round'],
  featherForm: ['standard', 'standard'],
  respiratoryRisk: ['clear', 'clear'],
  skeletalRisk: ['clear', 'clear'],
  fertilityRisk: ['clear', 'clear'],
};

function foundationCopy(allele: string): AlleleCopy {
  return { allele, origin: 'foundation' };
}

function createGenome(
  profile: TraitProfile,
  overrides: LocusOverrides = {},
): Genome {
  const loci = Object.fromEntries(
    Object.keys(RULESET.loci).map((rawId) => {
      const id = rawId as LocusId;
      const [paternal, maternal] = overrides[id] ?? defaultAlleles[id];
      const genotype: LocusGenotype = {
        paternal: foundationCopy(paternal),
        maternal: foundationCopy(maternal),
      };
      return [id, genotype];
    }),
  ) as Record<LocusId, LocusGenotype>;

  const units = (value: number): readonly PolygenicUnit[] => [
    { paternal: value - 2, maternal: value + 1 },
    { paternal: value + 2, maternal: value - 1 },
    { paternal: value, maternal: value },
  ];

  const performance = Object.fromEntries(
    RULESET.performanceTraits.map((trait) => [trait, units(profile[trait] ?? 50)]),
  ) as Record<PerformanceTrait, readonly PolygenicUnit[]>;
  const temperament = Object.fromEntries(
    RULESET.temperamentTraits.map((trait) => [trait, units(profile[trait] ?? 50)]),
  ) as Record<TemperamentTrait, readonly PolygenicUnit[]>;

  return { loci, performance, temperament };
}

interface CreateBirdInput {
  id: string;
  ring: string;
  name: string;
  species: SpeciesId;
  sex: Sex;
  profile?: TraitProfile;
  loci?: LocusOverrides;
  fatherId?: string;
  motherId?: string;
  owner?: string;
  birthDate?: string;
}

function createBird(input: CreateBirdInput): Bird {
  return {
    birdId: birdId(input.id),
    bandId: bandId(input.ring),
    sex: input.sex,
    birthDate: input.birthDate ?? '2024-04-18',
    birthPlayerId: 'PLAYER-ORIGIN',
    fatherId: input.fatherId ? birdId(input.fatherId) : undefined,
    motherId: input.motherId ? birdId(input.motherId) : undefined,
    speciesAtBirth: input.species,
    genome: createGenome(input.profile ?? {}, input.loci),
    ancestryComposition: {
      peachFaced: input.species === 'peachFaced' ? 100 : 0,
      fischers: input.species === 'fischers' ? 100 : 0,
      masked: input.species === 'masked' ? 100 : 0,
    },
    rulesetVersion: RULESET.version,
    generation: 0,
    knownLoci: [
      'baseColor',
      'dilution',
      'blueSeries',
      'faceColor',
      'eyeColor',
      'respiratoryRisk',
      'skeletalRisk',
    ],
    status: {
      name: input.name,
      ownerPlayerId: input.owner ?? 'PLAYER-DEMO',
      health: 'healthy',
      lifeStage: 'adult',
      canBreed: true,
      breedingCount: 0,
      lifetimeBreedingLimit: 6,
      cooldownUntilTurn: 0,
    },
  };
}

const foundationDefinitions: readonly CreateBirdInput[] = [
  ['PF-A1', 'PF-A2', 'PF-A3', 'PF-A4'].map((id, index) => ({
    id,
    ring: `ARCH-PF-${index + 1}`,
    name: `桃脸祖鸟${index + 1}`,
    species: 'peachFaced' as const,
    sex: index % 2 === 0 ? ('male' as const) : ('female' as const),
    owner: 'ARCHIVE',
  })),
  ['FI-A1', 'FI-A2', 'FI-A3', 'FI-A4'].map((id, index) => ({
    id,
    ring: `ARCH-FI-${index + 1}`,
    name: `费氏祖鸟${index + 1}`,
    species: 'fischers' as const,
    sex: index % 2 === 0 ? ('male' as const) : ('female' as const),
    owner: 'ARCHIVE',
  })),
  ['MA-A1', 'MA-A2', 'MA-A3', 'MA-A4'].map((id, index) => ({
    id,
    ring: `ARCH-MA-${index + 1}`,
    name: `面具祖鸟${index + 1}`,
    species: 'masked' as const,
    sex: index % 2 === 0 ? ('male' as const) : ('female' as const),
    owner: 'ARCHIVE',
  })),
].flat();

const seedDefinitions: readonly CreateBirdInput[] = [
  {
    id: 'BIRD-M-001',
    ring: 'LW-2024-0001',
    name: '晨露',
    species: 'peachFaced',
    sex: 'male',
    fatherId: 'PF-A1',
    motherId: 'PF-A2',
    profile: { speed: 70, burst: 73, endurance: 39, alertness: 65, docility: 42 },
    loci: { dilution: ['full', 'dilute'], eyeColor: ['dark', 'ruby'] },
  },
  {
    id: 'BIRD-F-001',
    ring: 'LW-2024-0002',
    name: '晚霞',
    species: 'peachFaced',
    sex: 'female',
    fatherId: 'PF-A3',
    motherId: 'PF-A4',
    profile: { speed: 43, endurance: 72, learning: 67, docility: 64, alertness: 46 },
    loci: { faceColor: ['coral', 'amber'], bodyPattern: ['even', 'pied'] },
  },
  {
    id: 'BIRD-M-002',
    ring: 'LW-2024-0003',
    name: '湖蓝',
    species: 'fischers',
    sex: 'male',
    fatherId: 'FI-A1',
    motherId: 'FI-A2',
    profile: { agility: 74, recall: 69, endurance: 54, alertness: 66, docility: 38 },
    loci: { blueSeries: ['green', 'blue'], wingPattern: ['solid', 'edged'] },
  },
  {
    id: 'BIRD-F-002',
    ring: 'LW-2024-0004',
    name: '青柠',
    species: 'fischers',
    sex: 'female',
    fatherId: 'FI-A3',
    motherId: 'FI-A4',
    profile: { learning: 75, recall: 64, docility: 71, affinity: 69, alertness: 40 },
    loci: { blueSeries: ['aqua', 'blue'], respiratoryRisk: ['clear', 'risk'] },
  },
  {
    id: 'BIRD-M-003',
    ring: 'LW-2024-0005',
    name: '墨羽',
    species: 'masked',
    sex: 'male',
    fatherId: 'MA-A1',
    motherId: 'MA-A2',
    profile: { burst: 71, courage: 70, alertness: 76, stability: 43, docility: 34 },
    loci: { faceColor: ['ivory', 'amber'], skeletalRisk: ['clear', 'risk'] },
  },
  {
    id: 'BIRD-F-003',
    ring: 'LW-2024-0006',
    name: '银铃',
    species: 'masked',
    sex: 'female',
    fatherId: 'MA-A3',
    motherId: 'MA-A4',
    profile: { endurance: 65, stability: 68, affinity: 72, speed: 44, burst: 41 },
    loci: {
      baseColor: ['olive', 'cinnamon'],
      eyeColor: ['dark', 'ruby'],
      featherForm: ['standard', 'longTail'],
    },
  },
];

export function createDemoState(): GameState {
  const birds = seedDefinitions.map(createBird);
  const pedigreeBirds = foundationDefinitions.map(createBird);

  return {
    saveId: 'save-lovebird-demo',
    rulesetVersion: RULESET.version,
    revision: 0,
    turn: 1,
    birds: Object.fromEntries(birds.map((bird) => [bird.birdId, bird])),
    pedigreeBirds: Object.fromEntries(
      pedigreeBirds.map((bird) => [bird.birdId, bird]),
    ),
    events: [],
    breedingEvents: [],
    interactions: [],
    completedSecondGeneration: false,
  };
}
