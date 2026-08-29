import { createDemoState } from '../fixtures/seedBirds';
import type { GameState } from '../domain/types';

export interface GameRepository {
  load(): Promise<GameState | null>;
  save(expectedRevision: number, next: GameState): Promise<void>;
  resetDemo(): Promise<GameState>;
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export class MemoryGameRepository implements GameRepository {
  private state: GameState | null;

  constructor(initialState: GameState | null = null) {
    this.state = initialState ? cloneState(initialState) : null;
  }

  async load(): Promise<GameState | null> {
    return this.state ? cloneState(this.state) : null;
  }

  async save(expectedRevision: number, next: GameState): Promise<void> {
    if (!this.state || this.state.revision !== expectedRevision) {
      throw new Error('REVISION_CONFLICT');
    }
    if (next.revision !== expectedRevision + 1) {
      throw new Error('REVISION_SEQUENCE_INVALID');
    }
    this.state = cloneState(next);
  }

  async resetDemo(): Promise<GameState> {
    this.state = createDemoState();
    return cloneState(this.state);
  }
}
