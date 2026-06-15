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

export const GAME_WIDTH = 750;
export const GAME_HEIGHT = 1334;

export const AWAKEN_GOAL = 100;
