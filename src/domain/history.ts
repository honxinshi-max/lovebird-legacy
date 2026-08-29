import { computeBreedingDigest } from './breeding';
import { RULESET } from './rules';
import type { Bird, BirdEvent, BirdId, GameState } from './types';

const immutableKeys = new Set([
  'birdId',
  'bandId',
  'birthDate',
  'birthPlayerId',
  'fatherId',
  'motherId',
  'speciesAtBirth',
  'genome',
  'ancestryComposition',
  'rulesetVersion',
]);

function containsImmutablePatch(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsImmutablePatch);
  return Object.entries(value).some(
    ([key, child]) => immutableKeys.has(key) || containsImmutablePatch(child),
  );
}

export function appendHistoryEvent(
  state: GameState,
  event: BirdEvent,
): GameState {
  if (state.events.some((existing) => existing.eventId === event.eventId)) {
    throw new Error('DUPLICATE_EVENT_ID');
  }
  if (containsImmutablePatch(event.payload)) {
    throw new Error('IMMUTABLE_HISTORY');
  }
  return { ...state, events: [...state.events, structuredClone(event)] };
}

function assertNoSelfAncestor(
  bird: Bird,
  birds: Readonly<Record<string, Bird>>,
): void {
  const visited = new Set<BirdId>();
  const stack = [bird.fatherId, bird.motherId].filter(
    (id): id is BirdId => id !== undefined,
  );
  while (stack.length > 0) {
    const id = stack.pop() as BirdId;
    if (id === bird.birdId) throw new Error('SELF_ANCESTOR');
    if (visited.has(id)) continue;
    visited.add(id);
    const ancestor = birds[id];
    if (ancestor?.fatherId) stack.push(ancestor.fatherId);
    if (ancestor?.motherId) stack.push(ancestor.motherId);
  }
}

export function assertStateIntegrity(state: GameState): void {
  if (state.rulesetVersion !== RULESET.version) {
    throw new Error('RULESET_VERSION_MISMATCH');
  }
  if (new Set(state.events.map((event) => event.eventId)).size !== state.events.length) {
    throw new Error('DUPLICATE_EVENT_ID');
  }
  if (
    new Set(state.breedingEvents.map((event) => event.eventId)).size !==
    state.breedingEvents.length
  ) {
    throw new Error('DUPLICATE_BREEDING_EVENT_ID');
  }
  const birds = { ...state.pedigreeBirds, ...state.birds };
  for (const bird of Object.values(birds)) {
    assertNoSelfAncestor(bird, birds);
  }
  for (const breedingEvent of state.breedingEvents) {
    if (breedingEvent.rulesetVersion !== state.rulesetVersion) {
      throw new Error('BREEDING_RULESET_MISMATCH');
    }
    const chicks = breedingEvent.childIds.map((id) => state.birds[id]);
    if (chicks.some((bird) => !bird)) throw new Error('BREEDING_CHILD_MISSING');
    if (
      chicks.some(
        (bird) =>
          bird?.fatherId !== breedingEvent.fatherId ||
          bird?.motherId !== breedingEvent.motherId,
      )
    ) {
      throw new Error('BREEDING_PARENT_MISMATCH');
    }
    if (
      computeBreedingDigest(
        breedingEvent.eventId,
        chicks.filter((bird): bird is Bird => bird !== undefined),
      ) !== breedingEvent.resultDigest
    ) {
      throw new Error('RESULT_DIGEST_MISMATCH');
    }
  }
}
