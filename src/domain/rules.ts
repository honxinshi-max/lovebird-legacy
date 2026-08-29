import type {
  CompatibilityLevel,
  LocusId,
  PerformanceTrait,
  SpeciesId,
  TemperamentTrait,
} from './types';

export interface AlleleDefinition {
  label: string;
  dominance: number;
  colorToken?: string;
  healthSeverity?: 'none' | 'watch' | 'severe';
}

export interface LocusDefinition {
  id: LocusId;
  label: string;
  category: 'color' | 'pattern' | 'eye' | 'face' | 'feather' | 'health';
  expression: 'dominant' | 'recessive' | 'codominant';
  alleles: Readonly<Record<string, AlleleDefinition>>;
  mutationRate: number;
  positiveReward?: false;
}

export interface SpeciesDefinition {
  label: string;
  scientificLabel: string;
  stability: {
    color: number;
    flight: number;
    temperament: number;
  };
  basePotential: Record<PerformanceTrait | TemperamentTrait, number>;
}

const performanceTraits = [
  'speed',
  'burst',
  'endurance',
  'agility',
  'recall',
  'learning',
] as const satisfies readonly PerformanceTrait[];

const temperamentTraits = [
  'docility',
  'courage',
  'stability',
  'alertness',
  'affinity',
] as const satisfies readonly TemperamentTrait[];

const basePotential = (
  values: Partial<Record<PerformanceTrait | TemperamentTrait, number>>,
): Record<PerformanceTrait | TemperamentTrait, number> => ({
  speed: 50,
  burst: 50,
  endurance: 50,
  agility: 50,
  recall: 50,
  learning: 50,
  docility: 50,
  courage: 50,
  stability: 50,
  alertness: 50,
  affinity: 50,
  ...values,
});

const loci: Record<LocusId, LocusDefinition> = {
  baseColor: {
    id: 'baseColor',
    label: '基础羽色',
    category: 'color',
    expression: 'codominant',
    mutationRate: 0.001,
    alleles: {
      wild: { label: '野生绿', dominance: 3, colorToken: 'green' },
      olive: { label: '橄榄', dominance: 2, colorToken: 'olive' },
      cinnamon: { label: '肉桂', dominance: 1, colorToken: 'cinnamon' },
    },
  },
  dilution: {
    id: 'dilution',
    label: '羽色稀释',
    category: 'color',
    expression: 'recessive',
    mutationRate: 0.0008,
    alleles: {
      full: { label: '全色', dominance: 2 },
      dilute: { label: '淡化', dominance: 1 },
    },
  },
  blueSeries: {
    id: 'blueSeries',
    label: '蓝色系',
    category: 'color',
    expression: 'recessive',
    mutationRate: 0.0008,
    alleles: {
      green: { label: '绿色系', dominance: 3, colorToken: 'green' },
      aqua: { label: '水绿色系', dominance: 2, colorToken: 'aqua' },
      blue: { label: '蓝色系', dominance: 1, colorToken: 'blue' },
    },
  },
  faceColor: {
    id: 'faceColor',
    label: '脸部色系',
    category: 'color',
    expression: 'codominant',
    mutationRate: 0.001,
    alleles: {
      coral: { label: '珊瑚红', dominance: 3, colorToken: 'coral' },
      amber: { label: '琥珀橙', dominance: 2, colorToken: 'amber' },
      ivory: { label: '象牙白', dominance: 1, colorToken: 'ivory' },
    },
  },
  wingPattern: {
    id: 'wingPattern',
    label: '翼部花纹',
    category: 'pattern',
    expression: 'dominant',
    mutationRate: 0.0006,
    alleles: {
      solid: { label: '纯色翼', dominance: 2 },
      edged: { label: '镶边翼', dominance: 1 },
    },
  },
  bodyPattern: {
    id: 'bodyPattern',
    label: '身体花纹',
    category: 'pattern',
    expression: 'codominant',
    mutationRate: 0.0007,
    alleles: {
      even: { label: '均匀', dominance: 2 },
      pied: { label: '不规则斑', dominance: 1 },
    },
  },
  eyeColor: {
    id: 'eyeColor',
    label: '眼睛颜色',
    category: 'eye',
    expression: 'recessive',
    mutationRate: 0.0004,
    alleles: {
      dark: { label: '深色眼', dominance: 2, colorToken: 'ink' },
      ruby: { label: '浅红眼', dominance: 1, colorToken: 'ruby' },
    },
  },
  faceShape: {
    id: 'faceShape',
    label: '脸型',
    category: 'face',
    expression: 'codominant',
    mutationRate: 0.0004,
    alleles: {
      round: { label: '圆润', dominance: 2 },
      wedge: { label: '利落', dominance: 1 },
    },
  },
  featherForm: {
    id: 'featherForm',
    label: '羽型',
    category: 'feather',
    expression: 'recessive',
    mutationRate: 0.0003,
    alleles: {
      standard: { label: '标准羽型', dominance: 2 },
      longTail: { label: '长尾羽型', dominance: 1 },
    },
  },
  respiratoryRisk: {
    id: 'respiratoryRisk',
    label: '呼吸健康位点',
    category: 'health',
    expression: 'recessive',
    mutationRate: 0.0001,
    positiveReward: false,
    alleles: {
      clear: { label: '未见风险', dominance: 2, healthSeverity: 'none' },
      risk: { label: '隐性风险', dominance: 1, healthSeverity: 'watch' },
    },
  },
  skeletalRisk: {
    id: 'skeletalRisk',
    label: '骨骼健康位点',
    category: 'health',
    expression: 'recessive',
    mutationRate: 0.0001,
    positiveReward: false,
    alleles: {
      clear: { label: '未见风险', dominance: 2, healthSeverity: 'none' },
      risk: { label: '隐性风险', dominance: 1, healthSeverity: 'severe' },
    },
  },
  fertilityRisk: {
    id: 'fertilityRisk',
    label: '繁殖力位点',
    category: 'health',
    expression: 'recessive',
    mutationRate: 0.0001,
    positiveReward: false,
    alleles: {
      clear: { label: '未见风险', dominance: 2, healthSeverity: 'none' },
      risk: { label: '隐性风险', dominance: 1, healthSeverity: 'watch' },
    },
  },
};

export const RULESET = {
  version: 'lovebird-v0.1.0',
  compatibilityLevels: ['high', 'limited', 'low', 'incompatible'] as const,
  species: {
    peachFaced: {
      label: '桃脸牡丹',
      scientificLabel: 'Agapornis roseicollis',
      stability: { color: 0.72, flight: 0.48, temperament: 0.56 },
      basePotential: basePotential({ speed: 54, burst: 55, docility: 58, affinity: 60 }),
    },
    fischers: {
      label: '费氏牡丹',
      scientificLabel: 'Agapornis fischeri',
      stability: { color: 0.68, flight: 0.62, temperament: 0.46 },
      basePotential: basePotential({ agility: 57, recall: 55, courage: 54, alertness: 56 }),
    },
    masked: {
      label: '面具牡丹',
      scientificLabel: 'Agapornis personatus',
      stability: { color: 0.76, flight: 0.54, temperament: 0.43 },
      basePotential: basePotential({ endurance: 55, learning: 56, stability: 54, alertness: 58 }),
    },
  } satisfies Record<SpeciesId, SpeciesDefinition>,
  loci,
  performanceTraits,
  temperamentTraits,
} as const;

const compatibility: Record<string, CompatibilityLevel> = {
  'fischers:fischers': 'high',
  'fischers:masked': 'limited',
  'fischers:peachFaced': 'low',
  'masked:masked': 'high',
  'masked:peachFaced': 'low',
  'peachFaced:peachFaced': 'high',
};

export function getCompatibility(
  first: SpeciesId,
  second: SpeciesId,
): CompatibilityLevel {
  const key = [first, second].sort().join(':');
  return compatibility[key] ?? 'incompatible';
}

export function getLocus(id: LocusId): LocusDefinition {
  return RULESET.loci[id];
}
