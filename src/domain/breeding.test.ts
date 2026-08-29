import { describe, expect, it } from 'vitest';

import { createDemoState } from '../fixtures/seedBirds';
import type { Bird, BirdId, EventId } from './types';
import { assessPairing, breedClutch } from './breeding';

describe('pair assessment and breeding', () => {
  it('shows compatibility, known relationship and carrier risk without choosing a best pair', () => {
    const state = createDemoState();
    const assessment = assessPairing(
      state.birds['BIRD-M-002'] as Bird,
      state.birds['BIRD-F-003'] as Bird,
      state,
    );

    expect(assessment.eligible).toBe(true);
    expect(assessment.compatibility).toBe('limited');
    expect(assessment.relationship.category).toBe('unrelated-known');
    expect(assessment).not.toHaveProperty('score');
    expect(assessment).not.toHaveProperty('recommended');
  });

  it('blocks invalid sex and health while keeping close breeding as an explicit risk', () => {
    const state = createDemoState();
    const male = state.birds['BIRD-M-001'] as Bird;
    const otherMale = state.birds['BIRD-M-002'] as Bird;
    expect(assessPairing(male, otherMale, state).blockingReasons).toContainEqual(
      expect.objectContaining({ code: 'sex-pair-invalid' }),
    );

    const relatedMother = structuredClone(state.birds['BIRD-F-001']) as Bird;
    relatedMother.fatherId = male.birdId;
    state.birds[relatedMother.birdId] = relatedMother;
    const related = assessPairing(male, relatedMother, state);
    expect(related.eligible).toBe(true);
    expect(related.warnings).toContainEqual(
      expect.objectContaining({ code: 'close-kinship' }),
    );

    relatedMother.status.health = 'unwell';
    expect(assessPairing(male, relatedMother, state).blockingReasons).toContainEqual(
      expect.objectContaining({ code: 'health-restricted' }),
    );
  });

  it('creates a replayable auditable three-chick clutch', () => {
    const state = createDemoState();
    const command = {
      fatherId: 'BIRD-M-001' as BirdId,
      motherId: 'BIRD-F-001' as BirdId,
      eventId: 'BREED-1' as EventId,
      seed: 8241,
    };

    const first = breedClutch(command, state);
    const replay = breedClutch(command, state);

    expect(first).toEqual(replay);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error('Expected successful clutch');
    expect(first.chicks).toHaveLength(3);
    expect(new Set(first.chicks.map((chick) => chick.birdId)).size).toBe(3);
    expect(first.chicks.every((chick) => chick.fatherId === command.fatherId)).toBe(true);
    expect(first.chicks.every((chick) => chick.motherId === command.motherId)).toBe(true);
    expect(
      first.chicks.every(
        (chick) =>
          Object.values(chick.ancestryComposition).reduce(
            (sum, value) => sum + value,
            0,
          ) === 100,
      ),
    ).toBe(true);
    expect(first.explanations).toHaveLength(3);
    expect(first.explanations.every((items) => items.length === 12)).toBe(true);
  });

  it('returns a recorded failed attempt instead of creating chicks', () => {
    const state = createDemoState();
    const result = breedClutch(
      {
        fatherId: 'BIRD-M-001' as BirdId,
        motherId: 'BIRD-M-002' as BirdId,
        eventId: 'BREED-BLOCKED' as EventId,
        seed: 11,
      },
      state,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected blocked attempt');
    expect(result.chicks).toHaveLength(0);
    expect(result.event.type).toBe('breeding-attempted');
  });
});
