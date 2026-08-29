import { useCallback, useEffect, useRef, useState } from 'react';

import { GameService, type BreedReceipt } from './application/game';
import type { PairAssessment } from './domain/breeding';
import type { Bird, BirdId, GameState } from './domain/types';
import type { ValueRoute } from './domain/types';
import { IndexedDbGameRepository } from './persistence/indexedDb';
import type { GameRepository } from './persistence/repository';
import { Birdhouse } from './ui/Birdhouse';
import { BirdProfile } from './ui/BirdProfile';
import { BirthReveal, KeptBirdTransition } from './ui/BirthReveal';
import { CompletionPanel } from './ui/CompletionPanel';
import { PairingLab } from './ui/PairingLab';

interface AppProps {
  repository?: GameRepository;
}

type SuccessfulReceipt = Extract<BreedReceipt, { ok: true }>;
type Screen =
  | { name: 'birdhouse' }
  | { name: 'profile'; birdId: BirdId }
  | { name: 'pairing'; generation: 1 | 2 }
  | { name: 'reveal'; receipt: SuccessfulReceipt }
  | { name: 'transition'; birdId: BirdId }
  | { name: 'completion' };

export function App({ repository }: AppProps) {
  const repositoryRef = useRef<GameRepository>(
    repository ?? new IndexedDbGameRepository(),
  );
  const serviceRef = useRef<GameService | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'birdhouse' });
  const [error, setError] = useState<string | null>(null);
  const [breedingError, setBreedingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    GameService.create(repositoryRef.current)
      .then((service) => {
        if (!active) return;
        serviceRef.current = service;
        const loaded = service.getState();
        setState(loaded);
        if (loaded.completedSecondGeneration) {
          setScreen({ name: 'completion' });
        } else if (loaded.selectedBirdId) {
          const selected = loaded.birds[loaded.selectedBirdId];
          setScreen(
            selected?.status.lifeStage === 'adult'
              ? { name: 'pairing', generation: 2 }
              : { name: 'transition', birdId: loaded.selectedBirdId },
          );
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'LOAD_FAILED');
      });
    return () => {
      active = false;
    };
  }, []);

  async function openBird(birdId: BirdId) {
    const service = serviceRef.current;
    if (!service) return;
    await service.recordInteraction({ type: 'profile-viewed', birdId });
    setState(service.getState());
    setScreen({ name: 'profile', birdId });
  }

  const comparePair = useCallback(
    async (fatherId: BirdId, motherId: BirdId): Promise<PairAssessment> => {
      const service = serviceRef.current;
      if (!service) throw new Error('SERVICE_NOT_READY');
      const assessment = service.comparePair(fatherId, motherId);
      await service.recordInteraction({ type: 'pair-compared' });
      setState(service.getState());
      return assessment;
    },
    [],
  );

  async function breed(fatherId: BirdId, motherId: BirdId) {
    const service = serviceRef.current;
    if (!service) return;
    const receipt = await service.breed({ fatherId, motherId });
    setState(service.getState());
    if (!receipt.ok) {
      setBreedingError(receipt.reasons.map((item) => item.label).join('；'));
      return;
    }
    setBreedingError(null);
    setScreen(
      receipt.generation >= 2
        ? { name: 'completion' }
        : { name: 'reveal', receipt },
    );
  }

  async function openExplanation(birdId: BirdId, receipt: SuccessfulReceipt) {
    const service = serviceRef.current;
    if (!service) return;
    await service.recordInteraction({
      type: 'inheritance-explanation-opened',
      birdId,
      breedingEventId: receipt.breedingEventId,
    });
    setState(service.getState());
  }

  async function keepBird(birdId: BirdId, route: ValueRoute, reason: string) {
    const service = serviceRef.current;
    if (!service) return;
    await service.keepBird(birdId, route, reason);
    setState(service.getState());
    setScreen({ name: 'transition', birdId });
  }

  async function continueToSecondGeneration(birdId: BirdId) {
    const service = serviceRef.current;
    if (!service) return;
    await service.advanceDemoAge(birdId);
    setState(service.getState());
    setScreen({ name: 'pairing', generation: 2 });
  }

  if (error) {
    return <main className="app-shell"><h1>存档暂时无法打开</h1><p>{error}</p></main>;
  }
  if (!state) {
    return <main className="app-shell loading-screen"><p className="eyebrow">LOVE BIRD LINEAGE LAB</p><h1>牡丹育种社会</h1><p>正在整理鸟环与血统记录…</p></main>;
  }

  const birds: Record<string, Bird> = { ...state.pedigreeBirds, ...state.birds };
  const selected =
    screen.name === 'profile' || screen.name === 'transition'
      ? state.birds[screen.birdId]
      : undefined;

  return (
    <main className="app-shell">
      {screen.name === 'birdhouse' || screen.name === 'profile' ? (
        <Birdhouse
          state={state}
          onOpenBird={(birdId) => void openBird(birdId)}
          onStartPairing={() => setScreen({ name: 'pairing', generation: 1 })}
        />
      ) : null}
      {screen.name === 'profile' && selected ? (
        <BirdProfile
          bird={selected}
          birds={birds}
          onClose={() => setScreen({ name: 'birdhouse' })}
        />
      ) : null}
      {screen.name === 'pairing' ? (
        <PairingLab
          state={state}
          generation={screen.generation}
          onBack={() =>
            setScreen(
              screen.generation === 2 && state.selectedBirdId
                ? { name: 'transition', birdId: state.selectedBirdId }
                : { name: 'birdhouse' },
            )
          }
          onCompare={comparePair}
          onBreed={breed}
          breedingError={breedingError}
        />
      ) : null}
      {screen.name === 'reveal' ? (
        <BirthReveal
          state={state}
          receipt={screen.receipt}
          onOpenExplanation={(birdId) => openExplanation(birdId, screen.receipt)}
          onKeep={keepBird}
        />
      ) : null}
      {screen.name === 'transition' && selected ? (
        <KeptBirdTransition
          bird={selected}
          onContinue={() => continueToSecondGeneration(selected.birdId)}
        />
      ) : null}
      {screen.name === 'completion' ? (
        <CompletionPanel
          state={state}
          onReturn={() => setScreen({ name: 'birdhouse' })}
        />
      ) : null}
    </main>
  );
}
