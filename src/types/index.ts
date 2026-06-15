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
}

export interface SynthesisRecipe {
  input: { tier: PetalTier; color: PetalColor; count: number }[];
  output: { tier: PetalTier; color: PetalColor; count: number };
  name: string;
}

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
