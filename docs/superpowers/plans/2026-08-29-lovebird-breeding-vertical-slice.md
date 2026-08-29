# Lovebird Breeding Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally runnable Chinese 2D web prototype in which a player studies six lovebirds, compares pairings, breeds a deterministic three-chick clutch, understands each result, keeps a bird, and completes a second generation.

**Architecture:** Keep genetics, breeding, pedigree, phenotype and immutable history as pure TypeScript modules behind explicit interfaces. A React application layer issues domain commands, persists complete snapshots and append-only events through an IndexedDB repository, and renders parameterized SVG birds without changing domain data.

**Tech Stack:** Node.js 22+, React 19, TypeScript, Vite, Vitest, Testing Library, IndexedDB, SVG/CSS animation, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-lovebird-breeding-vertical-slice-design.md`

## Global Constraints

- Single-player local web app; simplified Chinese; no login, payment, network API or realtime AI.
- Three configured species, six adult seed birds, twelve discrete loci, six performance groups and five temperament groups.
- Every bird has immutable identity, ancestry, parents, genome, original breeder and ruleset version.
- Same save, parent pair and breeding-event seed must replay exactly; event history is append-only.
- No overall score, best-pair button or individual that can reach the top band in every performance and temperament dimension.
- Compatibility, kinship, carrier risk, age, health, cooldown and lifetime breeding limit are checked before breeding.
- Severe health defects never grant a positive collection, competition or rarity reward.
- The main path must work at 1440×900 and 1024×768 and must not depend on hover.
- Do not add placeholder controls for the deferred economy, Club, training, market, photography or official-breed systems.

---

## File Map

### Runtime and configuration

- `package.json` — scripts and dependency contract.
- `vite.config.ts`, `tsconfig.json`, `index.html` — Vite and TypeScript entry configuration.
- `src/main.tsx`, `src/App.tsx` — React bootstrap and top-level screen state.
- `src/styles.css` — tokens, layout, responsive behavior and animations.

### Domain

- `src/domain/types.ts` — stable identifiers, bird/genome/event and view-neutral result types.
- `src/domain/random.ts` — deterministic PRNG, seed mixing and stable IDs/hashes.
- `src/domain/rules.ts` — versioned species, loci, compatibility and trade-off configuration.
- `src/domain/genetics.ts` — inheritance, recombination, mutation and genetic explanation.
- `src/domain/phenotype.ts` — genotype-to-appearance and potential mapping with trade-offs.
- `src/domain/pedigree.ts` — ancestry composition, common ancestors, relationship and risk.
- `src/domain/breeding.ts` — eligibility and atomic three-chick clutch generation.
- `src/domain/history.ts` — append-only event validation and replay guard.

### Application, persistence and fixtures

- `src/application/game.ts` — new game, pair comparison, breeding, keep decision and second-generation commands.
- `src/persistence/repository.ts` — storage interface and in-memory implementation.
- `src/persistence/indexedDb.ts` — browser IndexedDB implementation.
- `src/fixtures/seedBirds.ts` — six seed birds and older pedigree fixtures.

### UI and rendering

- `src/rendering/BirdAvatar.tsx` — layered parameterized SVG.
- `src/ui/Birdhouse.tsx` — six-bird browsing and progress rail.
- `src/ui/BirdProfile.tsx` — identity, known/tested/unknown genetics and history.
- `src/ui/PairingLab.tsx` — parent selection, comparison and risk panel.
- `src/ui/BirthReveal.tsx` — clutch reveal, explanations and keep-direction capture.
- `src/ui/PedigreePanel.tsx` — four-generation view and common-ancestor display.
- `src/ui/CompletionPanel.tsx` — second-generation completion and structured feedback summary.

### Verification

- `src/domain/*.test.ts` — deterministic and invariant tests beside domain modules.
- `src/application/game.test.ts` — full command-level two-generation scenario.
- `src/ui/App.test.tsx` — accessible UI flow smoke test.
- `output/playwright/*.png` — real-browser evidence at the two target viewports.
- `docs/verification/2026-08-29-browser-qa.md` — happy path, refresh persistence, viewport and console receipts.

---

### Task 1: Runnable shell, core types and deterministic randomness

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/domain/types.ts`
- Create: `src/domain/random.ts`
- Test: `src/domain/random.test.ts`

**Interfaces:**
- Consumes: no application code.
- Produces: branded `BirdId`, `BandId`, `EventId`; `Bird`, `Genome`, `BirdEvent`, `GameState`; `createRandom(seed)`, `mixSeed(...parts)`, `stableId(prefix, ...parts)`.

- [x] **Step 1: Add the runnable TypeScript/React test shell and failing deterministic-random test**

```ts
import { describe, expect, it } from 'vitest';
import { createRandom, mixSeed, stableId } from './random';

describe('deterministic random contract', () => {
  it('replays the same sequence and stable identifiers', () => {
    const seed = mixSeed('save-demo', 'BIRD-M-001', 'BIRD-F-001', 'breed-1');
    const a = createRandom(seed);
    const b = createRandom(seed);
    expect([a.next(), a.nextInt(0, 99), a.pick(['a', 'b', 'c'])])
      .toEqual([b.next(), b.nextInt(0, 99), b.pick(['a', 'b', 'c'])]);
    expect(stableId('EVT', seed, 0)).toBe(stableId('EVT', seed, 0));
  });
});
```

- [x] **Step 2: Run the focused test and confirm red state**

Run: `npm install && npm test -- src/domain/random.test.ts`

Expected: FAIL because `src/domain/random.ts` does not exist or exports are missing.

- [x] **Step 3: Implement the typed model and PRNG without browser dependencies**

```ts
export interface SeededRandom {
  next(): number;
  nextInt(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

export function mixSeed(...parts: readonly (string | number)[]): number;
export function createRandom(seed: number): SeededRandom;
export function stableId(prefix: string, ...parts: readonly (string | number)[]): string;
```

Define model unions explicitly: `SpeciesId`, `Sex`, `LifeStage`, `HealthState`, `CompatibilityLevel`, `LocusId`, `ValueRoute`, `BirdEventType`. Define `Bird` with immutable birth/genome fields and mutable breeding state separated as `BirdStatus`.

- [x] **Step 4: Verify test, typecheck and production build**

Run: `npm test -- src/domain/random.test.ts && npm run build`

Expected: random test PASS and Vite production build PASS with a minimal Chinese loading shell.

- [x] **Step 5: Commit Task 1**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src
git commit -m "chore: bootstrap deterministic lovebird prototype"
```

---

### Task 2: Versioned species, loci and six seed birds

**Files:**
- Create: `src/domain/rules.ts`
- Create: `src/domain/rules.test.ts`
- Create: `src/fixtures/seedBirds.ts`
- Create: `src/fixtures/seedBirds.test.ts`

**Interfaces:**
- Consumes: `SpeciesId`, `LocusId`, `Genome`, `Bird` from `domain/types`.
- Produces: `RULESET`, `getCompatibility(a, b)`, `getLocus(id)`, `createDemoState()`.

- [x] **Step 1: Write failing configuration and fixture-contract tests**

```ts
it('contains the promised first-slice content', () => {
  expect(Object.keys(RULESET.species)).toHaveLength(3);
  expect(Object.keys(RULESET.loci)).toHaveLength(12);
  expect(RULESET.performanceTraits).toHaveLength(6);
  expect(RULESET.temperamentTraits).toHaveLength(5);
});

it('creates six eligible adults with immutable identity', () => {
  const state = createDemoState();
  expect(Object.values(state.birds)).toHaveLength(6);
  expect(new Set(Object.values(state.birds).map((bird) => bird.birdId)).size).toBe(6);
  expect(Object.values(state.birds).every((bird) => bird.bandId && bird.status.canBreed)).toBe(true);
});
```

- [x] **Step 2: Run both tests and confirm missing rules/fixtures**

Run: `npm test -- src/domain/rules.test.ts src/fixtures/seedBirds.test.ts`

Expected: FAIL on unresolved `RULESET` and `createDemoState`.

- [x] **Step 3: Implement exact configuration and seeds**

```ts
export const RULESET = {
  version: 'lovebird-v0.1.0',
  species: {
    peachFaced: { label: '桃脸牡丹', stability: { color: 0.72, flight: 0.48, temperament: 0.56 } },
    fischers: { label: '费氏牡丹', stability: { color: 0.68, flight: 0.62, temperament: 0.46 } },
    masked: { label: '面具牡丹', stability: { color: 0.76, flight: 0.54, temperament: 0.43 } },
  },
  performanceTraits: ['speed', 'burst', 'endurance', 'agility', 'recall', 'learning'],
  temperamentTraits: ['docility', 'courage', 'stability', 'alertness', 'affinity'],
} as const;
```

Add twelve complete locus definitions grouped 4 color, 2 pattern, 1 eye, 1 face, 1 feather and 3 health loci. Seed two adults per species, three male and three female overall, with intentional carriers and trade-offs. Add older non-owned ancestor birds to `pedigreeBirds`, not the six visible owned birds.

- [x] **Step 4: Verify content counts and all referenced alleles**

Run: `npm test -- src/domain/rules.test.ts src/fixtures/seedBirds.test.ts && npm run build`

Expected: PASS; no seed genome references an undefined locus or allele.

- [x] **Step 5: Commit Task 2**

```bash
git add src/domain/rules.ts src/domain/rules.test.ts src/fixtures
git commit -m "feat: add versioned lovebird rules and seed flock"
```

---

### Task 3: Genetics, phenotype explanations and anti-god-bird trade-offs

**Files:**
- Create: `src/domain/genetics.ts`
- Create: `src/domain/genetics.test.ts`
- Create: `src/domain/phenotype.ts`
- Create: `src/domain/phenotype.test.ts`

**Interfaces:**
- Consumes: `Genome`, `Bird`, `RULESET`, `SeededRandom`.
- Produces: `inheritGenome(father, mother, rng)`, `derivePhenotype(bird)`, `derivePotential(bird)`, `explainInheritance(child, father, mother)`.

- [x] **Step 1: Write failing inheritance, replay and trade-off tests**

```ts
it('attributes every inherited allele to a parent or explicit mutation', () => {
  const { father, mother } = fixturePair();
  const genome = inheritGenome(father, mother, createRandom(741));
  for (const locus of Object.values(genome.loci)) {
    expect(['father', 'mother', 'mutation']).toContain(locus.paternal.origin);
    expect(['father', 'mother', 'mutation']).toContain(locus.maternal.origin);
  }
});

it('cannot generate an individual in the top band for every dimension', () => {
  const { father, mother } = fixturePair();
  for (let seed = 0; seed < 10_000; seed += 1) {
    const child = makeBird(inheritGenome(father, mother, createRandom(seed)));
    const values = Object.values(derivePotential(child).allTraits);
    expect(values.every((value) => value >= 90)).toBe(false);
  }
});
```

- [x] **Step 2: Run focused tests and observe red state**

Run: `npm test -- src/domain/genetics.test.ts src/domain/phenotype.test.ts`

Expected: FAIL because inheritance and phenotype functions are absent.

- [x] **Step 3: Implement traceable inheritance and resource axes**

```ts
export function inheritGenome(
  father: Bird,
  mother: Bird,
  rng: SeededRandom,
): Genome;

export interface PotentialProfile {
  performance: Record<PerformanceTrait, number>;
  temperament: Record<TemperamentTrait, number>;
  bands: Record<PerformanceTrait | TemperamentTrait, PotentialBand>;
  tradeOffs: readonly TradeOffExplanation[];
}
```

Implement linked-block retention from species stability, per-locus mutation records, ancestry-neutral genotype inheritance, and four trade-off axes: burst energy, flight morphology, neural response and social attachment. Clamp displayed dimensions to 5–95, but prevent all-top outcomes through resource-axis deductions rather than a hidden overall-score budget.

- [x] **Step 4: Verify deterministic replay, explanations and 10,000-clutch invariant**

Run: `npm test -- src/domain/genetics.test.ts src/domain/phenotype.test.ts`

Expected: PASS including identical result for the same seed and no all-top individual.

- [x] **Step 5: Commit Task 3**

```bash
git add src/domain/genetics.ts src/domain/genetics.test.ts src/domain/phenotype.ts src/domain/phenotype.test.ts
git commit -m "feat: implement explainable genetics and tradeoffs"
```

---

### Task 4: Pedigree, compatibility, eligibility and atomic breeding

**Files:**
- Create: `src/domain/pedigree.ts`
- Create: `src/domain/pedigree.test.ts`
- Create: `src/domain/breeding.ts`
- Create: `src/domain/breeding.test.ts`

**Interfaces:**
- Consumes: birds by ID, rules, genetics and phenotype functions.
- Produces: `analyzeRelationship(a, b, birds)`, `calculateAncestry(father, mother)`, `assessPairing(father, mother, state)`, `breedClutch(command, state)`.

- [x] **Step 1: Write failing relationship and breeding tests**

```ts
it.each([
  ['parent-child', parentChildFixture()],
  ['full-siblings', fullSiblingFixture()],
  ['half-siblings', halfSiblingFixture()],
  ['grandparent', grandparentFixture()],
  ['unrelated-known', unrelatedFixture()],
])('classifies %s symmetrically', (expected, [a, b, birds]) => {
  expect(analyzeRelationship(a, b, birds).category).toBe(expected);
  expect(analyzeRelationship(b, a, birds)).toEqual(analyzeRelationship(a, b, birds));
});

it('creates an auditable three-chick clutch', () => {
  const state = createDemoState();
  const result = breedClutch({ fatherId: 'BIRD-M-001', motherId: 'BIRD-F-001', eventId: 'BREED-1', seed: 8241 }, state);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.chicks).toHaveLength(3);
});
```

- [x] **Step 2: Run relationship and breeding tests in red state**

Run: `npm test -- src/domain/pedigree.test.ts src/domain/breeding.test.ts`

Expected: FAIL on missing analysis and breeding modules.

- [x] **Step 3: Implement conservative pedigree and eligibility rules**

```ts
export interface PairAssessment {
  eligible: boolean;
  blockingReasons: readonly PairingReason[];
  warnings: readonly PairingReason[];
  compatibility: CompatibilityLevel;
  relationship: RelationshipAnalysis;
  healthRisk: RiskBand;
  possiblePhenotypes: readonly PossibilityBand[];
}

export type BreedResult =
  | { ok: true; event: BreedingEvent; chicks: readonly [Bird, Bird, Bird] }
  | { ok: false; event: BreedingAttemptEvent; reasons: readonly PairingReason[] };
```

Unknown ancestry must produce `risk-unknown`, never `unrelated`. Build ancestry vectors as a 50/50 normalized merge. Block incompatible, same-sex, immature, unwell, cooldown and exhausted birds. Use event-scoped child IDs and seeds. Preserve severe defects as negative health outcomes only.

- [x] **Step 4: Verify fixtures, pair symmetry and clutch replay**

Run: `npm test -- src/domain/pedigree.test.ts src/domain/breeding.test.ts src/domain/genetics.test.ts`

Expected: PASS; the same event replays the same IDs, genomes, ancestry and explanations.

- [x] **Step 5: Commit Task 4**

```bash
git add src/domain/pedigree.ts src/domain/pedigree.test.ts src/domain/breeding.ts src/domain/breeding.test.ts
git commit -m "feat: add pedigree risk and atomic breeding"
```

---

### Task 5: Append-only history, persistence and two-generation application commands

**Files:**
- Create: `src/domain/history.ts`
- Create: `src/domain/history.test.ts`
- Create: `src/persistence/repository.ts`
- Create: `src/persistence/indexedDb.ts`
- Create: `src/application/game.ts`
- Create: `src/application/game.test.ts`

**Interfaces:**
- Consumes: `createDemoState`, `assessPairing`, `breedClutch`, domain types.
- Produces: `GameRepository`, `MemoryGameRepository`, `IndexedDbGameRepository`, `GameService` command API and a local privacy-bounded `InteractionEvent` ledger.

- [x] **Step 1: Write failing immutable-history and full-loop command tests**

```ts
it('rejects an event that rewrites immutable birth identity', () => {
  const state = createDemoState();
  expect(() => appendEvent(state, forgedBirthRewrite())).toThrow('IMMUTABLE_HISTORY');
});

it('persists a first clutch, keep decision and second generation', async () => {
  const repo = new MemoryGameRepository();
  const game = await GameService.create(repo);
  const first = await game.breed(validFirstPairCommand());
  await game.keepBird(first.chickIds[0], 'rare-gene', '保留浅色眼携带组合');
  await game.advanceDemoAge(first.chickIds[0]);
  const second = await game.breed(validSecondPairCommand(first.chickIds[0]));
  expect(second.generation).toBe(2);
  expect((await repo.load())?.events.length).toBeGreaterThanOrEqual(5);
});

it('records only structured prototype feedback', async () => {
  const repo = new MemoryGameRepository();
  const game = await GameService.create(repo);
  await game.recordInteraction({ type: 'profile-viewed', birdId: 'BIRD-M-001' });
  expect(game.getState().interactions[0]).toMatchObject({ type: 'profile-viewed', birdId: 'BIRD-M-001' });
  expect(JSON.stringify(game.getState().interactions)).not.toMatch(/email|phone|account/i);
});
```

- [x] **Step 2: Run tests and confirm missing repository/service**

Run: `npm test -- src/domain/history.test.ts src/application/game.test.ts`

Expected: FAIL on missing modules.

- [x] **Step 3: Implement transaction-shaped commands and snapshot validation**

```ts
export interface GameRepository {
  load(): Promise<GameState | null>;
  save(expectedRevision: number, next: GameState): Promise<void>;
  resetDemo(): Promise<GameState>;
}

export class GameService {
  static create(repository: GameRepository): Promise<GameService>;
  getState(): GameState;
  comparePair(fatherId: BirdId, motherId: BirdId): PairAssessment;
  breed(command: BreedCommand): Promise<BreedReceipt>;
  keepBird(birdId: BirdId, route: ValueRoute, reason: string): Promise<void>;
  advanceDemoAge(birdId: BirdId): Promise<void>;
  recordInteraction(input: InteractionInput): Promise<void>;
}
```

Define interaction types `profile-viewed`, `pair-compared`, `inheritance-explanation-opened`, `keep-reason-recorded` and `second-generation-completed`. Validate ruleset version and result digest before save. Repository writes the complete next state in one IndexedDB transaction. On failure, service retains the prior authoritative state and returns a typed persistence error. Interaction payloads contain bird/event IDs and structured choices only—no account, contact, free-form identity or device fingerprint.

- [x] **Step 4: Verify the command-level two-generation scenario**

Run: `npm test -- src/domain/history.test.ts src/application/game.test.ts`

Expected: PASS with immutable history, revision conflict detection and a generation-two bird.

- [x] **Step 5: Commit Task 5**

```bash
git add src/domain/history.ts src/domain/history.test.ts src/persistence src/application
git commit -m "feat: persist immutable two-generation game state"
```

---

### Task 6: Layered bird rendering, birdhouse and profile

**Files:**
- Create: `src/rendering/BirdAvatar.tsx`
- Create: `src/rendering/BirdAvatar.test.tsx`
- Create: `src/ui/Birdhouse.tsx`
- Create: `src/ui/BirdProfile.tsx`
- Create: `src/ui/PedigreePanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `GameState`, `derivePhenotype`, `derivePotential`, `GameService`.
- Produces: accessible bird cards, layered SVG and profile/pedigree dialogs.

- [x] **Step 1: Write failing semantic rendering and profile tests**

```tsx
it('renders parameterized layers with an accessible identity', () => {
  render(<BirdAvatar bird={seedBird()} size="card" />);
  expect(screen.getByRole('img', { name: /桃脸牡丹.*晨露/ })).toBeVisible();
  expect(screen.getByTestId('bird-body')).toHaveAttribute('fill', expect.stringMatching(/^var\(--bird-/));
});

it('opens a bird profile without exposing hidden genotype truth', async () => {
  render(<App repository={new MemoryGameRepository()} />);
  await userEvent.click(await screen.findByRole('button', { name: /查看晨露档案/ }));
  expect(screen.getByRole('dialog', { name: /晨露的档案/ })).toBeVisible();
  expect(screen.getByText('尚未检测')).toBeVisible();
  expect(screen.queryByText(/hiddenAllele/)).not.toBeInTheDocument();
});
```

- [x] **Step 2: Run UI tests and confirm red state**

Run: `npm test -- src/rendering/BirdAvatar.test.tsx src/ui/App.test.tsx`

Expected: FAIL because UI/rendering modules are missing.

- [x] **Step 3: Implement the calm aviary visual language and responsive birdhouse**

Use an earthy paper/ink palette with teal and coral state accents, not a generic dashboard. Render body, wing, face mask, tail, eye, beak, feet and pattern as named SVG layers. Use shared CSS keyframes for breathing, blinking and head tilt; respect `prefers-reduced-motion`. Cards show two strengths, one explicit cost, health and breeding status. Profile separates observed, tested and unknown genetics.

- [x] **Step 4: Verify UI tests and both viewport layouts**

Run: `npm test -- src/rendering/BirdAvatar.test.tsx src/ui/App.test.tsx && npm run build`

Expected: PASS; production build has no TypeScript errors.

- [x] **Step 5: Commit Task 6**

```bash
git add src/rendering src/ui src/App.tsx src/styles.css
git commit -m "feat: add layered aviary and bird profiles"
```

---

### Task 7: Pairing lab, birth reveal, keep decision and completion UI

**Files:**
- Create: `src/ui/PairingLab.tsx`
- Create: `src/ui/BirthReveal.tsx`
- Create: `src/ui/CompletionPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `GameService.comparePair`, `GameService.breed`, `GameService.keepBird`, `GameService.advanceDemoAge`.
- Produces: complete accessible first- and second-generation player flow.

- [x] **Step 1: Add a failing UI-level complete-flow test**

```tsx
it('completes a first clutch and records a non-score keep reason', async () => {
  render(<App repository={new MemoryGameRepository()} />);
  await userEvent.click(await screen.findByRole('button', { name: '进入配对实验室' }));
  await chooseParent('父本：晨露');
  await chooseParent('母本：青柠');
  expect(screen.getByText(/机会成本/)).toBeVisible();
  expect(screen.queryByText(/综合战力|最佳配对/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '确认繁育' }));
  expect(await screen.findAllByRole('article', { name: /幼鸟/ })).toHaveLength(3);
  await keepFirstChick('稀有基因保留', '保留浅色眼携带组合');
  expect(screen.getByText(/准备第二代/)).toBeVisible();
});
```

- [x] **Step 2: Run the flow test and confirm missing screen behavior**

Run: `npm test -- src/ui/App.test.tsx`

Expected: FAIL before the pairing and reveal screens exist.

- [x] **Step 3: Implement screen state as an explicit finite flow**

```ts
type Screen =
  | { name: 'birdhouse' }
  | { name: 'profile'; birdId: BirdId }
  | { name: 'pairing'; generation: 1 | 2 }
  | { name: 'reveal'; breedingEventId: EventId }
  | { name: 'completion'; secondGenerationBirdIds: readonly BirdId[] };
```

Show compatibility, relationship, known unknowns, risk bands, possible appearances and trade-offs before enabling breed. Reveal exactly three chicks and concrete parent-origin explanations. Require a value route plus a 4–80 character structured reason before keeping. Demo-age only the selected bird, then guide the player to a non-close-relative mate and completion. Call `recordInteraction` when profiles, comparisons and explanations are actually opened; `CompletionPanel` summarizes those local events and labels them “仅保存在本设备”。

- [x] **Step 4: Verify complete React flow, accessibility and build**

Run: `npm test -- src/ui/App.test.tsx && npm run build`

Expected: PASS; no aggregate score or best-pair copy appears in runtime output.

- [x] **Step 5: Commit Task 7**

```bash
git add src/ui src/App.tsx src/styles.css
git commit -m "feat: complete two-generation breeding flow"
```

---

### Task 8: Browser persistence, viewport and completion verification

> Execution note (2026-08-29): the local Playwright operating contract requires CLI-first browser QA and avoids creating `@playwright/test` specs unless requested. This task was therefore executed through the installed Playwright CLI wrapper with fresh snapshots before interactions. Screenshots and an inspectable QA receipt replace the originally proposed test-spec/config files; Vitest still covers the automated UI flow.

**Files:**
- Create: `docs/verification/2026-08-29-browser-qa.md`
- Create: `output/playwright/*.png`
- Create: `README.md`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-08-29-lovebird-breeding-vertical-slice-design.md`

**Interfaces:**
- Consumes: built app and IndexedDB repository.
- Produces: inspectable browser acceptance receipt and final run instructions.

- [x] **Step 1: Define the real-browser acceptance checklist**

The checklist requires a fresh browser session to reach the birdhouse, complete the first clutch, record a keep reason, survive refresh, complete a second-generation cross, and survive a second refresh. Both target viewports must report no horizontal overflow and no error-level console messages.

- [x] **Step 2: Execute desktop CLI acceptance with fresh snapshots**

Use the installed Playwright CLI wrapper. Take a fresh accessibility snapshot after each page-changing action before using element references. Save evidence beneath `output/playwright/`.

- [x] **Step 3: Execute tablet acceptance and document exact commands**

Use isolated CLI sessions at 1440×900 and 1024×768. Start Vite on `127.0.0.1`. README must include `npm install`, `npm run dev`, `npm test`, `npm run build`, the browser QA receipt, prototype boundaries and the statement that compatibility parameters are game rules pending professional review.

Update the spec status from `待用户复核` to `已实现并完成技术验证` only after all commands below pass. Do not claim the five-person feedback gate has passed; label it `待目标玩家试玩`.

- [x] **Step 4: Run the full verification matrix and inspect browser screenshots**

Run: `npm test`

Expected: all unit, invariant, application and UI tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build PASS.

Then run the local app through isolated CLI sessions and inspect screenshots for bird cards, pairing lab, birth reveal, persistence transitions and completion. Confirm no console errors, overlaps, clipping or hidden required actions. Record exact receipts in `docs/verification/2026-08-29-browser-qa.md`.

- [x] **Step 5: Commit Task 8**

```bash
git add package.json README.md docs/superpowers docs/verification output/playwright
git commit -m "test: verify lovebird vertical slice end to end"
```

---

## Completion Audit

Before declaring the first step complete, inspect current files and command output and record evidence for each item:

- Six visible starter birds, three species, twelve loci, six performance and five temperament groups.
- Pair comparison covers compatibility, known kinship, unknown ancestry and health-carrier risk.
- Same seed replay and immutable history are covered by passing tests.
- Three-chick reveal contains parent-origin explanations and distinct phenotype/potential results.
- No total score, best-pair control, or all-top generated bird exists.
- Selected chick can mature in demo time and produce a second generation.
- IndexedDB state survives a browser refresh.
- Layered SVG visibly changes color, pattern, eye, face/body/tail parameters.
- The local interaction ledger records profile, comparison, explanation, keep-reason and second-generation milestones without personal identifiers.
- Desktop and tablet browser paths are visually usable and console-clean.
- Human feedback gate remains explicitly pending until actual target-player sessions occur.

Only after every technical item has direct evidence should the design status and goal be marked complete. The human feedback gate is an evaluation boundary, not a reason to misstate technical completion.
