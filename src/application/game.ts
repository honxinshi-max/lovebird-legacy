import {
  assessPairing,
  breedClutch,
  type BreedCommand,
  type PairAssessment,
  type PairingReason,
} from '../domain/breeding';
import { appendHistoryEvent, assertStateIntegrity } from '../domain/history';
import { mixSeed, stableId } from '../domain/random';
import type {
  Bird,
  BirdEvent,
  BirdId,
  EventId,
  GameState,
  InteractionEvent,
  InteractionType,
  ValueRoute,
} from '../domain/types';
import type { InheritanceExplanation } from '../domain/genetics';
import type { GameRepository } from '../persistence/repository';

export interface BreedActionInput {
  fatherId: BirdId;
  motherId: BirdId;
  seed?: number;
}

export type BreedReceipt =
  | {
      ok: true;
      breedingEventId: EventId;
      chickIds: readonly BirdId[];
      generation: number;
      explanations: readonly (readonly InheritanceExplanation[])[];
    }
  | { ok: false; reasons: readonly PairingReason[] };

export interface InteractionInput {
  type: InteractionType;
  birdId?: BirdId;
  breedingEventId?: EventId;
  valueRoute?: ValueRoute;
}

function historyEvent(
  eventId: string,
  type: BirdEvent['type'],
  turn: number,
  birdIds: readonly BirdId[],
  payload: Readonly<Record<string, unknown>> = {},
): BirdEvent {
  return {
    eventId: eventId as EventId,
    type,
    turn,
    birdIds,
    payload,
  };
}

export class GameService {
  private constructor(
    private readonly repository: GameRepository,
    private state: GameState,
  ) {}

  static async create(repository: GameRepository): Promise<GameService> {
    const state = (await repository.load()) ?? (await repository.resetDemo());
    assertStateIntegrity(state);
    return new GameService(repository, state);
  }

  getState(): GameState {
    return structuredClone(this.state);
  }

  comparePair(fatherId: BirdId, motherId: BirdId): PairAssessment {
    const father = this.state.birds[fatherId];
    const mother = this.state.birds[motherId];
    if (!father || !mother) throw new Error('BIRD_NOT_FOUND');
    return assessPairing(father, mother, this.state);
  }

  private async commit(nextWithoutRevision: GameState): Promise<void> {
    const expectedRevision = this.state.revision;
    const next = { ...nextWithoutRevision, revision: expectedRevision + 1 };
    assertStateIntegrity(next);
    await this.repository.save(expectedRevision, next);
    this.state = next;
  }

  async breed(input: BreedActionInput): Promise<BreedReceipt> {
    const seed = input.seed ?? mixSeed(this.state.saveId, this.state.revision, input.fatherId, input.motherId);
    const eventId = stableId(
      'BREED',
      this.state.saveId,
      this.state.revision,
      input.fatherId,
      input.motherId,
      seed,
    ) as EventId;
    const command: BreedCommand = { ...input, eventId, seed };
    const result = breedClutch(command, this.state);

    if (!result.ok) {
      const next = appendHistoryEvent(this.state, result.event);
      await this.commit(next);
      return { ok: false, reasons: result.reasons };
    }

    let next = structuredClone(this.state);
    for (const chick of result.chicks) {
      next.birds[chick.birdId] = chick;
    }
    for (const parentId of [input.fatherId, input.motherId]) {
      const parent = next.birds[parentId] as Bird;
      next.birds[parentId] = {
        ...parent,
        status: {
          ...parent.status,
          breedingCount: parent.status.breedingCount + 1,
          cooldownUntilTurn: next.turn + 1,
        },
      };
    }
    next.breedingEvents = [...next.breedingEvents, result.event];
    next = appendHistoryEvent(
      next,
      historyEvent(
        `${eventId}-SUCCESS`,
        'breeding-succeeded',
        next.turn,
        [input.fatherId, input.motherId, ...result.event.childIds],
        { breedingEventId: eventId, generation: result.event.generation },
      ),
    );
    result.chicks.forEach((chick, index) => {
      next = appendHistoryEvent(
        next,
        historyEvent(
          `${eventId}-BIRTH-${index + 1}`,
          'bird-born',
          next.turn,
          [chick.birdId, input.fatherId, input.motherId],
          { breedingEventId: eventId },
        ),
      );
    });
    if (result.event.generation >= 2) {
      next.completedSecondGeneration = true;
      next.interactions = [
        ...next.interactions,
        {
          eventId: stableId('UX', eventId, 'generation-2') as EventId,
          type: 'second-generation-completed',
          turn: next.turn,
          breedingEventId: eventId,
        },
      ];
    }
    await this.commit(next);
    return {
      ok: true,
      breedingEventId: eventId,
      chickIds: result.event.childIds,
      generation: result.event.generation,
      explanations: result.explanations,
    };
  }

  async keepBird(
    birdId: BirdId,
    valueRoute: ValueRoute,
    reason: string,
  ): Promise<void> {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 4 || trimmedReason.length > 80) {
      throw new Error('KEEP_REASON_LENGTH_INVALID');
    }
    const bird = this.state.birds[birdId];
    if (!bird || bird.generation < 1) throw new Error('KEEP_BIRD_INVALID');

    let next = structuredClone(this.state);
    next.birds[birdId] = {
      ...bird,
      status: { ...bird.status, valueRoute, keepReason: trimmedReason },
    };
    next.selectedBirdId = birdId;
    next = appendHistoryEvent(
      next,
      historyEvent(
        stableId('EVENT', this.state.saveId, this.state.revision, 'keep') as string,
        'keep-direction-set',
        next.turn,
        [birdId],
        { valueRoute, reason: trimmedReason },
      ),
    );
    next.interactions = [
      ...next.interactions,
      {
        eventId: stableId('UX', this.state.saveId, this.state.revision, 'keep') as EventId,
        type: 'keep-reason-recorded',
        turn: next.turn,
        birdId,
        valueRoute,
      },
    ];
    await this.commit(next);
  }

  async advanceDemoAge(birdId: BirdId): Promise<void> {
    const bird = this.state.birds[birdId];
    if (!bird || this.state.selectedBirdId !== birdId || !bird.status.valueRoute) {
      throw new Error('DEMO_AGE_ADVANCE_NOT_ALLOWED');
    }
    let next = structuredClone(this.state);
    next.turn += 1;
    next.birds[birdId] = {
      ...bird,
      status: {
        ...bird.status,
        lifeStage: 'adult',
        canBreed: bird.status.health === 'healthy' || bird.status.health === 'watch',
      },
    };
    next = appendHistoryEvent(
      next,
      historyEvent(
        stableId('EVENT', this.state.saveId, this.state.revision, 'age') as string,
        'demo-age-advanced',
        next.turn,
        [birdId],
        { from: 'chick', to: 'adult' },
      ),
    );
    await this.commit(next);
  }

  async recordInteraction(input: InteractionInput): Promise<void> {
    const interaction: InteractionEvent = {
      eventId: stableId(
        'UX',
        this.state.saveId,
        this.state.revision,
        input.type,
        input.birdId ?? '',
        input.breedingEventId ?? '',
      ) as EventId,
      type: input.type,
      turn: this.state.turn,
      birdId: input.birdId,
      breedingEventId: input.breedingEventId,
      valueRoute: input.valueRoute,
    };
    await this.commit({
      ...this.state,
      interactions: [...this.state.interactions, interaction],
    });
  }
}
