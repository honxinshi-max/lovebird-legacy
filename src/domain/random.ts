export interface SeededRandom {
  next(): number;
  nextInt(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

function hashText(text: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function mixSeed(...parts: readonly (string | number)[]): number {
  return hashText(parts.map(String).join('\u001f'));
}

export function createRandom(seed: number): SeededRandom {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  return {
    next,
    nextInt(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError('INVALID_INTEGER_RANGE');
      }

      return Math.floor(next() * (max - min + 1)) + min;
    },
    chance(probability) {
      if (probability < 0 || probability > 1) {
        throw new RangeError('INVALID_PROBABILITY');
      }

      return next() < probability;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new RangeError('EMPTY_RANDOM_CHOICE');
      }

      return items[Math.floor(next() * items.length)] as T;
    },
  };
}

export function stableId(
  prefix: string,
  ...parts: readonly (string | number)[]
): string {
  return `${prefix}-${mixSeed(...parts).toString(36).toUpperCase().padStart(7, '0')}`;
}
