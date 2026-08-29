export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type BirdId = Brand<string, 'BirdId'>;
export type BandId = Brand<string, 'BandId'>;
export type EventId = Brand<string, 'EventId'>;

export type SpeciesId = 'peachFaced' | 'fischers' | 'masked';
export type Sex = 'male' | 'female';
export type LifeStage = 'chick' | 'juvenile' | 'adult' | 'retired';
export type HealthState = 'healthy' | 'watch' | 'unwell' | 'severe';
export type CompatibilityLevel = 'high' | 'limited' | 'low' | 'incompatible';
export type RiskBand = 'low' | 'guarded' | 'high' | 'critical' | 'unknown';
export type ValueRoute =
  | 'competition'
  | 'appearance'
  | 'affinity'
  | 'healthy-population'
  | 'rare-gene';

export type PerformanceTrait =
  | 'speed'
  | 'burst'
  | 'endurance'
  | 'agility'
  | 'recall'
  | 'learning';

export type TemperamentTrait =
  | 'docility'
  | 'courage'
  | 'stability'
  | 'alertness'
  | 'affinity';

export type LocusId =
  | 'baseColor'
  | 'dilution'
  | 'blueSeries'
  | 'faceColor'
  | 'wingPattern'
  | 'bodyPattern'
  | 'eyeColor'
  | 'faceShape'
  | 'featherForm'
  | 'respiratoryRisk'
  | 'skeletalRisk'
  | 'fertilityRisk';

export type AlleleOrigin = 'father' | 'mother' | 'mutation' | 'foundation';

export interface AlleleCopy {
  allele: string;
  origin: AlleleOrigin;
  sourceBirdId?: BirdId;
  mutatedFrom?: string;
}

export interface LocusGenotype {
  paternal: AlleleCopy;
  maternal: AlleleCopy;
}

export interface PolygenicUnit {
  paternal: number;
  maternal: number;
}

export interface Genome {
  loci: Record<LocusId, LocusGenotype>;
  performance: Record<PerformanceTrait, readonly PolygenicUnit[]>;
  temperament: Record<TemperamentTrait, readonly PolygenicUnit[]>;
}

export interface BirdStatus {
  name: string;
  ownerPlayerId: string;
  health: HealthState;
  lifeStage: LifeStage;
  canBreed: boolean;
  breedingCount: number;
  lifetimeBreedingLimit: number;
  cooldownUntilTurn: number;
  valueRoute?: ValueRoute;
  keepReason?: string;
}

export interface Bird {
  birdId: BirdId;
  bandId: BandId;
  sex: Sex;
  birthDate: string;
  birthPlayerId: string;
  fatherId?: BirdId;
  motherId?: BirdId;
  speciesAtBirth: SpeciesId;
  genome: Genome;
  ancestryComposition: Record<SpeciesId, number>;
  rulesetVersion: string;
  generation: number;
  knownLoci: readonly LocusId[];
  status: BirdStatus;
}

export type BirdEventType =
  | 'bird-born'
  | 'bird-registered'
  | 'breeding-attempted'
  | 'breeding-succeeded'
  | 'keep-direction-set'
  | 'demo-age-advanced';

export interface BirdEvent {
  eventId: EventId;
  type: BirdEventType;
  turn: number;
  birdIds: readonly BirdId[];
  payload: Readonly<Record<string, unknown>>;
}

export type InteractionType =
  | 'profile-viewed'
  | 'pair-compared'
  | 'inheritance-explanation-opened'
  | 'keep-reason-recorded'
  | 'second-generation-completed';

export interface InteractionEvent {
  eventId: EventId;
  type: InteractionType;
  turn: number;
  birdId?: BirdId;
  breedingEventId?: EventId;
  valueRoute?: ValueRoute;
}

export interface BreedingEvent {
  eventId: EventId;
  fatherId: BirdId;
  motherId: BirdId;
  seed: number;
  rulesetVersion: string;
  childIds: readonly BirdId[];
  resultDigest: string;
  generation: number;
}

export interface GameState {
  saveId: string;
  rulesetVersion: string;
  revision: number;
  turn: number;
  birds: Record<string, Bird>;
  pedigreeBirds: Record<string, Bird>;
  events: readonly BirdEvent[];
  breedingEvents: readonly BreedingEvent[];
  interactions: readonly InteractionEvent[];
  selectedBirdId?: BirdId;
  completedSecondGeneration: boolean;
}
