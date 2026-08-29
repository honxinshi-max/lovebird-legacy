import { useEffect, useRef, useState } from 'react';

import { GameService } from './application/game';
import type { Bird, BirdId, GameState } from './domain/types';
import { IndexedDbGameRepository } from './persistence/indexedDb';
import type { GameRepository } from './persistence/repository';
import { Birdhouse } from './ui/Birdhouse';
import { BirdProfile } from './ui/BirdProfile';

interface AppProps {
  repository?: GameRepository;
}

type Screen = { name: 'birdhouse' } | { name: 'profile'; birdId: BirdId };

export function App({ repository }: AppProps) {
  const repositoryRef = useRef<GameRepository>(
    repository ?? new IndexedDbGameRepository(),
  );
  const serviceRef = useRef<GameService | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'birdhouse' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    GameService.create(repositoryRef.current)
      .then((service) => {
        if (!active) return;
        serviceRef.current = service;
        setState(service.getState());
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

  if (error) {
    return <main className="app-shell"><h1>存档暂时无法打开</h1><p>{error}</p></main>;
  }
  if (!state) {
    return <main className="app-shell loading-screen"><p className="eyebrow">LOVE BIRD LINEAGE LAB</p><h1>牡丹育种社会</h1><p>正在整理鸟环与血统记录…</p></main>;
  }

  const birds: Record<string, Bird> = { ...state.pedigreeBirds, ...state.birds };
  const selected = screen.name === 'profile' ? state.birds[screen.birdId] : undefined;

  return (
    <main className="app-shell">
      <Birdhouse
        state={state}
        onOpenBird={(birdId) => void openBird(birdId)}
        onStartPairing={() => undefined}
      />
      {selected ? (
        <BirdProfile
          bird={selected}
          birds={birds}
          onClose={() => setScreen({ name: 'birdhouse' })}
        />
      ) : null}
    </main>
  );
}
