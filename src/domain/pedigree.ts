import type { Bird, BirdId, RiskBand, SpeciesId } from './types';

export type RelationshipCategory =
  | 'self'
  | 'parent-child'
  | 'full-siblings'
  | 'half-siblings'
  | 'grandparent'
  | 'related'
  | 'unrelated-known'
  | 'risk-unknown';

export interface CommonAncestor {
  birdId: BirdId;
  name: string;
  pathLengths: readonly [number, number];
}

export interface RelationshipAnalysis {
  category: RelationshipCategory;
  commonAncestors: readonly CommonAncestor[];
  kinshipCoefficient: number | null;
  riskBand: RiskBand;
  ancestryComplete: boolean;
}

interface AncestorCollection {
  distances: Map<BirdId, number>;
  complete: boolean;
}

function directParentIds(bird: Bird): readonly BirdId[] {
  return [bird.fatherId, bird.motherId].filter(
    (id): id is BirdId => id !== undefined,
  );
}

function collectAncestors(
  bird: Bird,
  birds: Readonly<Record<string, Bird>>,
  maxDepth = 8,
): AncestorCollection {
  const distances = new Map<BirdId, number>();
  let complete = true;
  const queue = directParentIds(bird).map((id) => ({ id, distance: 1 }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.distance > maxDepth) continue;
    const prior = distances.get(current.id);
    if (prior !== undefined && prior <= current.distance) continue;
    distances.set(current.id, current.distance);

    const ancestor = birds[current.id];
    if (!ancestor) {
      complete = false;
      continue;
    }
    for (const parentId of directParentIds(ancestor)) {
      queue.push({ id: parentId, distance: current.distance + 1 });
    }
  }

  return { distances, complete };
}

function sameParentSet(first: Bird, second: Bird): boolean {
  return (
    first.fatherId !== undefined &&
    first.motherId !== undefined &&
    first.fatherId === second.fatherId &&
    first.motherId === second.motherId
  );
}

function sharedParent(first: Bird, second: Bird): boolean {
  const firstParents = new Set(directParentIds(first));
  return directParentIds(second).some((id) => firstParents.has(id));
}

function isParent(first: Bird, second: Bird): boolean {
  return second.fatherId === first.birdId || second.motherId === first.birdId;
}

function isGrandparent(
  first: Bird,
  second: Bird,
  birds: Readonly<Record<string, Bird>>,
): boolean {
  return directParentIds(second).some((parentId) => {
    const parent = birds[parentId];
    return parent ? isParent(first, parent) : false;
  });
}

function categoryRisk(
  category: RelationshipCategory,
  coefficient: number | null,
): RiskBand {
  if (category === 'risk-unknown') return 'unknown';
  if (category === 'self' || category === 'parent-child' || category === 'full-siblings') {
    return 'critical';
  }
  if (category === 'half-siblings' || category === 'grandparent') return 'high';
  if ((coefficient ?? 0) > 0) return 'guarded';
  return 'low';
}

export function analyzeRelationship(
  first: Bird,
  second: Bird,
  birds: Readonly<Record<string, Bird>>,
): RelationshipAnalysis {
  const firstAncestors = collectAncestors(first, birds);
  const secondAncestors = collectAncestors(second, birds);
  const ancestryComplete = firstAncestors.complete && secondAncestors.complete;
  const commonAncestors = [...firstAncestors.distances.entries()]
    .filter(([id]) => secondAncestors.distances.has(id))
    .map(([id, firstDistance]) => {
      const secondDistance = secondAncestors.distances.get(id) as number;
      return {
        birdId: id,
        name: birds[id]?.status.name ?? '未知祖先',
        pathLengths: [
          Math.min(firstDistance, secondDistance),
          Math.max(firstDistance, secondDistance),
        ] as const,
      };
    })
    .sort((a, b) => a.birdId.localeCompare(b.birdId));

  let category: RelationshipCategory;
  let coefficient: number | null;
  if (!ancestryComplete) {
    category = 'risk-unknown';
    coefficient = null;
  } else if (first.birdId === second.birdId) {
    category = 'self';
    coefficient = 0.5;
  } else if (isParent(first, second) || isParent(second, first)) {
    category = 'parent-child';
    coefficient = 0.25;
  } else if (sameParentSet(first, second)) {
    category = 'full-siblings';
    coefficient = 0.25;
  } else if (sharedParent(first, second)) {
    category = 'half-siblings';
    coefficient = 0.125;
  } else if (isGrandparent(first, second, birds) || isGrandparent(second, first, birds)) {
    category = 'grandparent';
    coefficient = 0.125;
  } else if (commonAncestors.length > 0) {
    category = 'related';
    coefficient = commonAncestors.reduce(
      (sum, ancestor) =>
        sum + 0.5 ** (ancestor.pathLengths[0] + ancestor.pathLengths[1] + 1),
      0,
    );
  } else {
    category = 'unrelated-known';
    coefficient = 0;
  }

  return {
    category,
    commonAncestors,
    kinshipCoefficient:
      coefficient === null ? null : Math.round(coefficient * 10_000) / 10_000,
    riskBand: categoryRisk(category, coefficient),
    ancestryComplete,
  };
}

export function calculateAncestry(
  father: Bird,
  mother: Bird,
): Record<SpeciesId, number> {
  const ancestry: Record<SpeciesId, number> = {
    peachFaced:
      (father.ancestryComposition.peachFaced +
        mother.ancestryComposition.peachFaced) /
      2,
    fischers:
      (father.ancestryComposition.fischers + mother.ancestryComposition.fischers) /
      2,
    masked:
      (father.ancestryComposition.masked + mother.ancestryComposition.masked) / 2,
  };
  const total = Object.values(ancestry).reduce((sum, value) => sum + value, 0);

  if (total <= 0) throw new Error('ANCESTRY_TOTAL_INVALID');
  for (const species of Object.keys(ancestry) as SpeciesId[]) {
    ancestry[species] = Math.round((ancestry[species] / total) * 1_000_000) / 10_000;
  }
  const roundedTotal = Object.values(ancestry).reduce((sum, value) => sum + value, 0);
  ancestry.masked = Math.round((ancestry.masked + 100 - roundedTotal) * 10_000) / 10_000;
  return ancestry;
}
