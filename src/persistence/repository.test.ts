import { describe, expect, it } from 'vitest';

import { createDemoState } from '../fixtures/seedBirds';
import { MemoryGameRepository } from './repository';

describe('optimistic game repository', () => {
  it('saves only the next revision and returns defensive copies', async () => {
    const repository = new MemoryGameRepository(createDemoState());
    const loaded = await repository.load();
    if (!loaded) throw new Error('Expected demo state');
    const next = { ...loaded, revision: 1, turn: 2 };

    await repository.save(0, next);
    next.turn = 99;

    expect((await repository.load())?.turn).toBe(2);
    await expect(repository.save(0, { ...next, revision: 1 })).rejects.toThrow(
      'REVISION_CONFLICT',
    );
  });
});
