import { describe, expect, it } from 'vitest';

import { createDemoState } from '../fixtures/seedBirds';
import type { BirdEvent, EventId } from './types';
import { appendHistoryEvent, assertStateIntegrity } from './history';

function event(id: string): BirdEvent {
  return {
    eventId: id as EventId,
    type: 'bird-registered',
    turn: 1,
    birdIds: [],
    payload: {},
  };
}

describe('append-only history', () => {
  it('appends a new event without mutating the prior state', () => {
    const state = createDemoState();
    const next = appendHistoryEvent(state, event('EVENT-1'));

    expect(state.events).toHaveLength(0);
    expect(next.events).toHaveLength(1);
    expect(next.revision).toBe(state.revision);
  });

  it('rejects duplicate event identifiers', () => {
    const first = appendHistoryEvent(createDemoState(), event('EVENT-1'));

    expect(() => appendHistoryEvent(first, event('EVENT-1'))).toThrow(
      'DUPLICATE_EVENT_ID',
    );
  });

  it('rejects payloads that try to rewrite immutable birth identity', () => {
    const forged: BirdEvent = {
      ...event('EVENT-FORGED'),
      type: 'keep-direction-set',
      payload: { patch: { birthDate: '2030-01-01' } },
    };

    expect(() => appendHistoryEvent(createDemoState(), forged)).toThrow(
      'IMMUTABLE_HISTORY',
    );
  });

  it('accepts an untouched demo state as internally consistent', () => {
    expect(() => assertStateIntegrity(createDemoState())).not.toThrow();
  });

  it('rejects a bird that appears in its own ancestry chain', () => {
    const state = createDemoState();
    const bird = structuredClone(state.birds['BIRD-M-001']);
    if (!bird) throw new Error('Expected seed bird');
    bird.fatherId = bird.birdId;
    state.birds[bird.birdId] = bird;

    expect(() => assertStateIntegrity(state)).toThrow('SELF_ANCESTOR');
  });
});
