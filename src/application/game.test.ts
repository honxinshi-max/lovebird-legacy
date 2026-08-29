import { describe, expect, it } from 'vitest';

import type { Bird, BirdId } from '../domain/types';
import { assertStateIntegrity } from '../domain/history';
import { MemoryGameRepository } from '../persistence/repository';
import { GameService } from './game';

describe('two-generation application commands', () => {
  it('persists a first clutch, keep decision and second generation', async () => {
    const repository = new MemoryGameRepository();
    const game = await GameService.create(repository);
    const first = await game.breed({
      fatherId: 'BIRD-M-001' as BirdId,
      motherId: 'BIRD-F-001' as BirdId,
      seed: 8241,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error('Expected first clutch');

    const selectedId = first.chickIds[0] as BirdId;
    await game.keepBird(selectedId, 'rare-gene', '保留浅色眼携带组合');
    await game.advanceDemoAge(selectedId);
    const selected = game.getState().birds[selectedId] as Bird;
    const second = await game.breed({
      fatherId: selected.sex === 'male' ? selectedId : ('BIRD-M-001' as BirdId),
      motherId: selected.sex === 'female' ? selectedId : ('BIRD-F-001' as BirdId),
      seed: 992,
    });

    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error('Expected second clutch');
    expect(second.generation).toBe(2);
    expect(game.getState().completedSecondGeneration).toBe(true);
    expect((await repository.load())?.events.length).toBeGreaterThanOrEqual(10);
  });

  it('records only structured prototype feedback', async () => {
    const repository = new MemoryGameRepository();
    const game = await GameService.create(repository);

    await game.recordInteraction({
      type: 'profile-viewed',
      birdId: 'BIRD-M-001' as BirdId,
    });

    expect(game.getState().interactions[0]).toMatchObject({
      type: 'profile-viewed',
      birdId: 'BIRD-M-001',
    });
    expect(JSON.stringify(game.getState().interactions)).not.toMatch(
      /email|phone|account|fingerprint/i,
    );
  });

  it('does not expose an unsaved optimistic state after a revision conflict', async () => {
    const repository = new MemoryGameRepository();
    const first = await GameService.create(repository);
    const stale = await GameService.create(repository);

    await first.recordInteraction({ type: 'profile-viewed' });
    await expect(
      stale.recordInteraction({ type: 'pair-compared' }),
    ).rejects.toThrow('REVISION_CONFLICT');
    expect(stale.getState().interactions).toHaveLength(0);
  });

  it('detects a child genome changed after its breeding receipt was saved', async () => {
    const game = await GameService.create(new MemoryGameRepository());
    const result = await game.breed({
      fatherId: 'BIRD-M-001' as BirdId,
      motherId: 'BIRD-F-001' as BirdId,
      seed: 8241,
    });
    if (!result.ok) throw new Error('Expected first clutch');
    const corrupted = game.getState();
    corrupted.birds[result.chickIds[0] as BirdId].genome.loci.eyeColor.paternal.allele =
      'forged';

    expect(() => assertStateIntegrity(corrupted)).toThrow(
      'RESULT_DIGEST_MISMATCH',
    );
  });
});
