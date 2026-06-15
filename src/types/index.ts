export type PetalTier = 1 | 2 | 3 | 4 | 5;

export type PetalColor = 'pink' | 'blue' | 'purple' | 'gold' | 'rainbow';

export interface Petal {
  id: string;
  tier: PetalTier;
  color: PetalColor;
  x: number;
  y: number;
  collected: boolean;
}

export interface InventoryItem {
  tier: PetalTier;
  color: PetalColor;
  count: number;
}

export interface GameState {
  petals: Petal[];
  inventory: InventoryItem[];
  score: number;
  awakeProgress: number;
  totalPetalsCollected: number;
  synthesisCount: number;
  playTime: number;
  isCompleted: boolean;
  unlockedRegions: RegionId[];
  rarePetalsCollected: number;
}

export interface SaveData {
  bestScore: number;
  bestProgress: number;
  totalPlayTime: number;
  gamesPlayed: number;
  lastPlayedAt: number;
  version: string;
}

export interface GameSaveData {
  gameState: GameState;
  savedAt: number;
  version: string;
}

export interface SynthesisRecipe {
  input: { tier: PetalTier; color: PetalColor; count: number }[];
  output: { tier: PetalTier; color: PetalColor; count: number };
  name: string;
}

export interface SynthesisQueueItem {
  tier: PetalTier;
  color: PetalColor;
  timestamp: number;
}

export interface ContinuousSynthesisResult {
  success: boolean;
  totalSynthesized: number;
  highestTier: PetalTier;
  outputs: { tier: PetalTier; color: PetalColor; count: number }[];
  chainLength: number;
  autoFedCount: number;
}

export interface AutoFeedResult {
  success: boolean;
  fedCount: number;
  items: { tier: PetalTier; color: PetalColor; count: number }[];
}

export interface InventoryValidationResult {
  valid: boolean;
  issues: string[];
  correctedInventory: InventoryItem[];
}

export interface AnimationTiming {
  synthesisDelay: number;
  chainSpeedMultiplier: number;
  minDelay: number;
  maxDelay: number;
}

export interface AudioCue {
  type: 'collect' | 'synthesis' | 'synthesis_chain' | 'synthesis_fail' | 'click' | 'victory' | 'auto_feed';
  tier?: PetalTier;
  chainIndex?: number;
  totalChain?: number;
}

export const SAVE_VERSION = '1.1.0';

export const DEFAULT_ANIMATION_TIMING: AnimationTiming = {
  synthesisDelay: 250,
  chainSpeedMultiplier: 0.9,
  minDelay: 80,
  maxDelay: 500
};

export const PETAL_COLORS: PetalColor[] = ['pink', 'blue', 'purple', 'gold', 'rainbow'];

export const PETAL_COLOR_MAP: Record<PetalColor, number> = {
  pink: 0xff9ec4,
  blue: 0x7dd3fc,
  purple: 0xc084fc,
  gold: 0xfcd34d,
  rainbow: 0xffffff
};

export const PETAL_TIER_NAMES: Record<PetalTier, string> = {
  1: '微光花瓣',
  2: '星辉花瓣',
  3: '月华花瓣',
  4: '晨曦花瓣',
  5: '永恒花瓣'
};

export type RegionId = 'initial' | 'starlight' | 'moonshadow' | 'dawn' | 'eternal';

export interface RegionSpawnRule {
  colors: PetalColor[];
  maxTier: PetalTier;
  rareChance: number;
  rareColor?: PetalColor;
  rareTier?: PetalTier;
}

export interface RegionConfig {
  id: RegionId;
  name: string;
  emoji: string;
  unlockThreshold: number;
  description: string;
  unlockGuide: string;
  spawnRule: RegionSpawnRule;
  bgColors: { sky1: number; sky2: number; ground1: number; ground2: number; treeColor: number; leafColor: number };
}

export const REGION_CONFIGS: RegionConfig[] = [
  {
    id: 'initial',
    name: '初始林地',
    emoji: '🌱',
    unlockThreshold: 0,
    description: '花瓣初绽的宁静林地',
    unlockGuide: '欢迎来到梦境森林，收集花瓣唤醒恋人吧！',
    spawnRule: { colors: ['pink', 'blue', 'purple'], maxTier: 1, rareChance: 0 },
    bgColors: { sky1: 0x0f0a1e, sky2: 0x1a0a2e, ground1: 0x1e1b4b, ground2: 0x312e81, treeColor: 0x1e1b4b, leafColor: 0x312e81 }
  },
  {
    id: 'starlight',
    name: '星辉林地',
    emoji: '⭐',
    unlockThreshold: 25,
    description: '星辰洒落的秘境森林',
    unlockGuide: '星辉林地已开放！金色花瓣在此绽放！',
    spawnRule: { colors: ['pink', 'blue', 'purple', 'gold'], maxTier: 2, rareChance: 0.15, rareColor: 'gold', rareTier: 2 },
    bgColors: { sky1: 0x0a0e2e, sky2: 0x151a4e, ground1: 0x1a1b5b, ground2: 0x2d2e91, treeColor: 0x151a4e, leafColor: 0x2d2e91 }
  },
  {
    id: 'moonshadow',
    name: '月影林地',
    emoji: '🌙',
    unlockThreshold: 50,
    description: '月光笼罩的幽深密林',
    unlockGuide: '月影林地已开放！彩虹花瓣悄然降临！',
    spawnRule: { colors: ['pink', 'blue', 'purple', 'gold', 'rainbow'], maxTier: 3, rareChance: 0.12, rareColor: 'rainbow', rareTier: 2 },
    bgColors: { sky1: 0x0a0520, sky2: 0x150a3e, ground1: 0x1a0b5b, ground2: 0x2d1b91, treeColor: 0x150a3e, leafColor: 0x2d1b91 }
  },
  {
    id: 'dawn',
    name: '晨曦林地',
    emoji: '🌅',
    unlockThreshold: 75,
    description: '曙光初现的希望之林',
    unlockGuide: '晨曦林地已开放！高阶花瓣在此闪耀！',
    spawnRule: { colors: ['pink', 'blue', 'purple', 'gold', 'rainbow'], maxTier: 4, rareChance: 0.18, rareColor: 'gold', rareTier: 3 },
    bgColors: { sky1: 0x1a0a1e, sky2: 0x2d1a3e, ground1: 0x3e1b4b, ground2: 0x4c2d81, treeColor: 0x2d1a3e, leafColor: 0x4c2d81 }
  },
  {
    id: 'eternal',
    name: '永恒花园',
    emoji: '✨',
    unlockThreshold: 100,
    description: '恋人苏醒的梦幻花园',
    unlockGuide: '永恒花园已开放！最高阶花瓣在此绽放！',
    spawnRule: { colors: ['pink', 'blue', 'purple', 'gold', 'rainbow'], maxTier: 5, rareChance: 0.25, rareColor: 'rainbow', rareTier: 4 },
    bgColors: { sky1: 0x2d0a3e, sky2: 0x4c1d6e, ground1: 0x5b2d8b, ground2: 0x7c3aed, treeColor: 0x4c1d6e, leafColor: 0x7c3aed }
  }
];

export const GAME_WIDTH = 750;
export const GAME_HEIGHT = 1334;

export const AWAKEN_GOAL = 100;
