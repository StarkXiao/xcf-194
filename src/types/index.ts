export type PetalTier = 1 | 2 | 3 | 4 | 5;

export type PetalColor = 'pink' | 'blue' | 'purple' | 'gold' | 'rainbow';

export type PetalVariant = 'flame' | 'frost' | 'shadow' | 'nature';

export interface Petal {
  id: string;
  tier: PetalTier;
  color: PetalColor;
  variant?: PetalVariant;
  x: number;
  y: number;
  collected: boolean;
}

export interface InventoryItem {
  tier: PetalTier;
  color: PetalColor;
  variant?: PetalVariant;
  count: number;
}

export interface MutationRecipe {
  colorA: PetalColor;
  colorB: PetalColor;
  variant: PetalVariant;
  tier: PetalTier;
  outputColor: PetalColor;
  outputTier: PetalTier;
  name: string;
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
  appliedEventBonusScore: number;
  appliedEventRarePetals: number;
  appliedEventSynthesisBonus: number;
  mutationCount: number;
}

export interface SaveData {
  bestScore: number;
  bestProgress: number;
  totalPlayTime: number;
  gamesPlayed: number;
  lastPlayedAt: number;
  version: string;
  totalPetalsCollected: number;
  totalSynthesisCount: number;
  totalRareCollected: number;
  bestEfficiency: number;
  eventBonusScore: number;
  eventRarePetals: number;
  eventTitles: string[];
  eventSynthesisBonus: number;
  growthTree: GrowthTreeSaveData;
}

export interface CollectionPathPoint {
  x: number;
  y: number;
  t: number;
}

export interface SynthesisLogEntry {
  tier: PetalTier;
  color: PetalColor;
  outputTier: PetalTier;
  outputColor: PetalColor;
  outputVariant?: PetalVariant;
  t: number;
}

export interface RewardSource {
  label: string;
  score: number;
  color: string;
}

export interface ReplayData {
  collectionPath: CollectionPathPoint[];
  synthesisLog: SynthesisLogEntry[];
  rewardSources: RewardSource[];
  petalsByColor: { color: PetalColor; count: number }[];
  petalsByRegion: { regionId: RegionId; count: number }[];
  efficiencyScore: number;
  peakRegion: RegionId;
  highestSynthesisTier: PetalTier;
  collectionRate: number;
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

export const SAVE_VERSION = '1.3.0';

export type GrowthNodeId =
  | 'score_boost_1'
  | 'score_boost_2'
  | 'score_boost_3'
  | 'score_boost_4'
  | 'petal_boost_1'
  | 'petal_boost_2'
  | 'petal_boost_3'
  | 'rare_boost_1'
  | 'rare_boost_2'
  | 'rare_boost_3'
  | 'synthesis_boost_1'
  | 'synthesis_boost_2'
  | 'synthesis_boost_3'
  | 'start_bonus_1'
  | 'start_bonus_2'
  | 'start_bonus_3'
  | 'progress_boost_1'
  | 'progress_boost_2'
  | 'progress_boost_3'
  | 'efficiency_boost'
  | 'time_boost'
  | 'collect_radius_boost'
  | 'spawn_boost'
  | 'master_collector'
  | 'master_synthesizer'
  | 'master_explorer';

export type GrowthNodeRequirementType =
  | 'gamesPlayed'
  | 'totalPetalsCollected'
  | 'totalSynthesisCount'
  | 'totalRareCollected'
  | 'bestScore'
  | 'totalPlayTime'
  | 'bestProgress';

export type GrowthNodeRewardType =
  | 'scoreMultiplier'
  | 'petalValueBonus'
  | 'rareChanceBonus'
  | 'synthesisScoreBonus'
  | 'startPetals'
  | 'progressBonus'
  | 'efficiencyBonus'
  | 'autoFeedStart'
  | 'collectRadiusBonus'
  | 'spawnRateBonus'
  | 'maxPetalsBonus';

export interface GrowthNode {
  id: GrowthNodeId;
  name: string;
  description: string;
  icon: string;
  requirementType: GrowthNodeRequirementType;
  requirementValue: number;
  rewardType: GrowthNodeRewardType;
  rewardValue: number;
  rewardDescription: string;
  branch: 'collector' | 'synthesizer' | 'explorer';
  tier: number;
  prerequisites: GrowthNodeId[];
}

export interface GrowthTreeSaveData {
  unlockedNodes: GrowthNodeId[];
  newUnlockedNodes: GrowthNodeId[];
  lastCheckedAt: number;
}

export interface PermanentBonuses {
  scoreMultiplier: number;
  petalValueBonus: number;
  rareChanceBonus: number;
  synthesisScoreBonus: number;
  startPetals: number;
  progressBonus: number;
  efficiencyBonus: number;
  autoFeedStartEnabled: boolean;
  collectRadiusBonus: number;
  spawnRateBonus: number;
  maxPetalsBonus: number;
}

export const GROWTH_TREE_NODES: GrowthNode[] = [
  {
    id: 'score_boost_1',
    name: '初心之光',
    description: '完成3局游戏解锁',
    icon: '✨',
    requirementType: 'gamesPlayed',
    requirementValue: 3,
    rewardType: 'scoreMultiplier',
    rewardValue: 0.05,
    rewardDescription: '全局分数 +5%',
    branch: 'collector',
    tier: 1,
    prerequisites: []
  },
  {
    id: 'score_boost_2',
    name: '星辉之力',
    description: '累计收集200花瓣解锁',
    icon: '🌟',
    requirementType: 'totalPetalsCollected',
    requirementValue: 200,
    rewardType: 'scoreMultiplier',
    rewardValue: 0.05,
    rewardDescription: '全局分数再 +5%',
    branch: 'collector',
    tier: 2,
    prerequisites: ['score_boost_1']
  },
  {
    id: 'score_boost_3',
    name: '月华祝福',
    description: '累计收集500花瓣解锁',
    icon: '🌙',
    requirementType: 'totalPetalsCollected',
    requirementValue: 500,
    rewardType: 'scoreMultiplier',
    rewardValue: 0.05,
    rewardDescription: '全局分数再 +5%',
    branch: 'collector',
    tier: 3,
    prerequisites: ['score_boost_2']
  },
  {
    id: 'petal_boost_1',
    name: '花瓣之契',
    description: '累计收集100花瓣解锁',
    icon: '🌸',
    requirementType: 'totalPetalsCollected',
    requirementValue: 100,
    rewardType: 'petalValueBonus',
    rewardValue: 5,
    rewardDescription: '每朵花瓣基础分 +5',
    branch: 'collector',
    tier: 1,
    prerequisites: []
  },
  {
    id: 'petal_boost_2',
    name: '繁花之约',
    description: '累计收集300花瓣解锁',
    icon: '💐',
    requirementType: 'totalPetalsCollected',
    requirementValue: 300,
    rewardType: 'petalValueBonus',
    rewardValue: 10,
    rewardDescription: '每朵花瓣基础分再 +10',
    branch: 'collector',
    tier: 2,
    prerequisites: ['petal_boost_1']
  },
  {
    id: 'rare_boost_1',
    name: '珍稀之眼',
    description: '累计收集10稀有花瓣解锁',
    icon: '💎',
    requirementType: 'totalRareCollected',
    requirementValue: 10,
    rewardType: 'rareChanceBonus',
    rewardValue: 0.03,
    rewardDescription: '稀有花瓣出现率 +3%',
    branch: 'collector',
    tier: 2,
    prerequisites: ['score_boost_1', 'petal_boost_1']
  },
  {
    id: 'rare_boost_2',
    name: '稀世之缘',
    description: '累计收集30稀有花瓣解锁',
    icon: '👑',
    requirementType: 'totalRareCollected',
    requirementValue: 30,
    rewardType: 'rareChanceBonus',
    rewardValue: 0.05,
    rewardDescription: '稀有花瓣出现率再 +5%',
    branch: 'collector',
    tier: 3,
    prerequisites: ['rare_boost_1']
  },
  {
    id: 'synthesis_boost_1',
    name: '合成初悟',
    description: '累计合成50次解锁',
    icon: '⚗️',
    requirementType: 'totalSynthesisCount',
    requirementValue: 50,
    rewardType: 'synthesisScoreBonus',
    rewardValue: 20,
    rewardDescription: '每次合成额外 +20分',
    branch: 'synthesizer',
    tier: 1,
    prerequisites: []
  },
  {
    id: 'synthesis_boost_2',
    name: '合成大师',
    description: '累计合成150次解锁',
    icon: '🔮',
    requirementType: 'totalSynthesisCount',
    requirementValue: 150,
    rewardType: 'synthesisScoreBonus',
    rewardValue: 30,
    rewardDescription: '每次合成额外再 +30分',
    branch: 'synthesizer',
    tier: 2,
    prerequisites: ['synthesis_boost_1']
  },
  {
    id: 'efficiency_boost',
    name: '效率之心',
    description: '最佳效率达到80分解锁',
    icon: '⚡',
    requirementType: 'bestScore',
    requirementValue: 3000,
    rewardType: 'efficiencyBonus',
    rewardValue: 0.1,
    rewardDescription: '分数加成 +10%',
    branch: 'synthesizer',
    tier: 2,
    prerequisites: ['synthesis_boost_1']
  },
  {
    id: 'start_bonus_1',
    name: '启程之礼',
    description: '完成5局游戏解锁',
    icon: '🎁',
    requirementType: 'gamesPlayed',
    requirementValue: 5,
    rewardType: 'startPetals',
    rewardValue: 3,
    rewardDescription: '每局开始赠送3个随机花瓣',
    branch: 'explorer',
    tier: 1,
    prerequisites: []
  },
  {
    id: 'start_bonus_2',
    name: '丰盛启程',
    description: '完成10局游戏解锁',
    icon: '🎊',
    requirementType: 'gamesPlayed',
    requirementValue: 10,
    rewardType: 'startPetals',
    rewardValue: 5,
    rewardDescription: '每局开始再赠送2个花瓣',
    branch: 'explorer',
    tier: 2,
    prerequisites: ['start_bonus_1']
  },
  {
    id: 'progress_boost_1',
    name: '唤醒之助',
    description: '最佳进度达到50%解锁',
    icon: '💖',
    requirementType: 'bestProgress',
    requirementValue: 50,
    rewardType: 'progressBonus',
    rewardValue: 0.1,
    rewardDescription: '唤醒进度 +10%',
    branch: 'explorer',
    tier: 1,
    prerequisites: []
  },
  {
    id: 'progress_boost_2',
    name: '深情呼唤',
    description: '最佳进度达到80%解锁',
    icon: '💗',
    requirementType: 'bestProgress',
    requirementValue: 80,
    rewardType: 'progressBonus',
    rewardValue: 0.1,
    rewardDescription: '唤醒进度再 +10%',
    branch: 'explorer',
    tier: 2,
    prerequisites: ['progress_boost_1']
  },
  {
    id: 'time_boost',
    name: '时光之契',
    description: '累计游玩60分钟解锁',
    icon: '⏰',
    requirementType: 'totalPlayTime',
    requirementValue: 3600,
    rewardType: 'autoFeedStart',
    rewardValue: 1,
    rewardDescription: '每局自动开启自动补料',
    branch: 'explorer',
    tier: 2,
    prerequisites: ['start_bonus_1', 'progress_boost_1']
  },
  {
    id: 'score_boost_4',
    name: '永恒辉光',
    description: '累计收集1000花瓣解锁',
    icon: '💫',
    requirementType: 'totalPetalsCollected',
    requirementValue: 1000,
    rewardType: 'scoreMultiplier',
    rewardValue: 0.05,
    rewardDescription: '全局分数再 +5%',
    branch: 'collector',
    tier: 4,
    prerequisites: ['score_boost_3', 'rare_boost_2']
  },
  {
    id: 'petal_boost_3',
    name: '花神恩赐',
    description: '累计收集600花瓣解锁',
    icon: '🌺',
    requirementType: 'totalPetalsCollected',
    requirementValue: 600,
    rewardType: 'petalValueBonus',
    rewardValue: 15,
    rewardDescription: '每朵花瓣基础分再 +15',
    branch: 'collector',
    tier: 3,
    prerequisites: ['petal_boost_2', 'rare_boost_1']
  },
  {
    id: 'rare_boost_3',
    name: '传说之缘',
    description: '累计收集60稀有花瓣解锁',
    icon: '👑',
    requirementType: 'totalRareCollected',
    requirementValue: 60,
    rewardType: 'rareChanceBonus',
    rewardValue: 0.07,
    rewardDescription: '稀有花瓣出现率再 +7%',
    branch: 'collector',
    tier: 4,
    prerequisites: ['rare_boost_2', 'score_boost_3']
  },
  {
    id: 'synthesis_boost_3',
    name: '合成宗师',
    description: '累计合成300次解锁',
    icon: '🔮',
    requirementType: 'totalSynthesisCount',
    requirementValue: 300,
    rewardType: 'synthesisScoreBonus',
    rewardValue: 50,
    rewardDescription: '每次合成额外再 +50分',
    branch: 'synthesizer',
    tier: 3,
    prerequisites: ['synthesis_boost_2', 'efficiency_boost']
  },
  {
    id: 'start_bonus_3',
    name: '豪华盛宴',
    description: '完成20局游戏解锁',
    icon: '🎉',
    requirementType: 'gamesPlayed',
    requirementValue: 20,
    rewardType: 'startPetals',
    rewardValue: 5,
    rewardDescription: '每局开始再赠送5个花瓣',
    branch: 'explorer',
    tier: 3,
    prerequisites: ['start_bonus_2', 'time_boost']
  },
  {
    id: 'progress_boost_3',
    name: '灵魂共鸣',
    description: '最佳进度达到100%解锁',
    icon: '💞',
    requirementType: 'bestProgress',
    requirementValue: 100,
    rewardType: 'progressBonus',
    rewardValue: 0.1,
    rewardDescription: '唤醒进度再 +10%',
    branch: 'explorer',
    tier: 3,
    prerequisites: ['progress_boost_2', 'time_boost']
  },
  {
    id: 'collect_radius_boost',
    name: '心灵感应',
    description: '累计收集400花瓣解锁',
    icon: '🧲',
    requirementType: 'totalPetalsCollected',
    requirementValue: 400,
    rewardType: 'collectRadiusBonus',
    rewardValue: 20,
    rewardDescription: '花瓣采集范围 +20',
    branch: 'collector',
    tier: 3,
    prerequisites: ['petal_boost_2', 'score_boost_2']
  },
  {
    id: 'spawn_boost',
    name: '花之律动',
    description: '累计游玩120分钟解锁',
    icon: '🌱',
    requirementType: 'totalPlayTime',
    requirementValue: 7200,
    rewardType: 'spawnRateBonus',
    rewardValue: 0.15,
    rewardDescription: '花瓣生成速度 +15%',
    branch: 'explorer',
    tier: 3,
    prerequisites: ['start_bonus_2', 'progress_boost_2']
  },
  {
    id: 'master_collector',
    name: '采集大师',
    description: '累计收集1500花瓣解锁',
    icon: '🏆',
    requirementType: 'totalPetalsCollected',
    requirementValue: 1500,
    rewardType: 'scoreMultiplier',
    rewardValue: 0.1,
    rewardDescription: '全局分数 +10% (采集大师)',
    branch: 'collector',
    tier: 5,
    prerequisites: ['score_boost_4', 'petal_boost_3', 'rare_boost_3']
  },
  {
    id: 'master_synthesizer',
    name: '合成大师',
    description: '累计合成500次解锁',
    icon: '🏅',
    requirementType: 'totalSynthesisCount',
    requirementValue: 500,
    rewardType: 'synthesisScoreBonus',
    rewardValue: 80,
    rewardDescription: '每次合成额外 +80分 (合成大师)',
    branch: 'synthesizer',
    tier: 5,
    prerequisites: ['synthesis_boost_3', 'efficiency_boost']
  },
  {
    id: 'master_explorer',
    name: '探索大师',
    description: '完成30局游戏解锁',
    icon: '🗺️',
    requirementType: 'gamesPlayed',
    requirementValue: 30,
    rewardType: 'maxPetalsBonus',
    rewardValue: 5,
    rewardDescription: '场上最大花瓣数 +5 (探索大师)',
    branch: 'explorer',
    tier: 5,
    prerequisites: ['start_bonus_3', 'progress_boost_3', 'spawn_boost']
  }
];

export const GROWTH_BRANCH_INFO: Record<'collector' | 'synthesizer' | 'explorer', { name: string; icon: string; color: string }> = {
  collector: { name: '采集之路', icon: '🌸', color: '#f472b6' },
  synthesizer: { name: '合成之道', icon: '⚗️', color: '#a78bfa' },
  explorer: { name: '探索之径', icon: '🗺️', color: '#60a5fa' }
};

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

export const PETAL_VARIANTS: PetalVariant[] = ['flame', 'frost', 'shadow', 'nature'];

export const PETAL_VARIANT_NAMES: Record<PetalVariant, string> = {
  flame: '烈焰',
  frost: '寒霜',
  shadow: '暗影',
  nature: '自然'
};

export const PETAL_VARIANT_COLOR_MAP: Record<PetalVariant, number> = {
  flame: 0xff4500,
  frost: 0x00bfff,
  shadow: 0x4b0082,
  nature: 0x32cd32
};

export const PETAL_VARIANT_EMOJI: Record<PetalVariant, string> = {
  flame: '🔥',
  frost: '❄️',
  shadow: '🌑',
  nature: '🌿'
};

export const MUTATION_RECIPES_CONFIG: {
  colorA: PetalColor;
  colorB: PetalColor;
  variant: PetalVariant;
  name: string;
}[] = [
  // 主色判定：持有量多者为主色，相同时 colorA 优先作主色（决定产出的基础颜色）
  // 颜色对决定品种，与顺序无关
  {
    colorA: 'pink',
    colorB: 'gold',
    variant: 'flame',
    name: '粉+金 → 烈焰'
  },
  {
    colorA: 'blue',
    colorB: 'purple',
    variant: 'frost',
    name: '蓝+紫 → 寒霜'
  },
  {
    colorA: 'pink',
    colorB: 'blue',
    variant: 'nature',
    name: '粉+蓝 → 自然'
  },
  {
    colorA: 'gold',
    colorB: 'purple',
    variant: 'shadow',
    name: '金+紫 → 暗影'
  }
];

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

export type EventRewardType = 'score' | 'petal' | 'rare_petal' | 'synthesis_bonus' | 'exclusive_title';

export interface EventTask {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'collect' | 'synthesis' | 'score' | 'play_time' | 'region' | 'rare';
  target: number;
  rewardType: EventRewardType;
  rewardValue: number;
  rewardDetail?: string;
}

export interface EventStageReward {
  id: string;
  stage: number;
  name: string;
  description: string;
  requirement: number;
  rewardType: EventRewardType;
  rewardValue: number;
  rewardDetail?: string;
}

export interface EventConfig {
  id: string;
  name: string;
  description: string;
  banner: string;
  startTime: number;
  endTime: number;
  tasks: EventTask[];
  stageRewards: EventStageReward[];
  stageProgressType: 'score' | 'petals_collected' | 'synthesis_count';
}

export interface EventTaskProgress {
  taskId: string;
  current: number;
  claimed: boolean;
  completed: boolean;
}

export interface EventStageProgress {
  stageId: string;
  claimed: boolean;
  completed: boolean;
}

export interface EventProgress {
  eventId: string;
  totalScore: number;
  totalPetalsCollected: number;
  totalSynthesisCount: number;
  taskProgress: EventTaskProgress[];
  stageProgress: EventStageProgress[];
  lastUpdated: number;
}

export interface EventSaveData {
  currentEventId: string | null;
  events: Record<string, EventProgress>;
  claimedRewards: string[];
}

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  id: 'spring_blossom_2026',
  name: '春日花祭',
  description: '限时活动·收集花瓣唤醒恋人，赢取珍稀奖励！',
  banner: '🌸',
  startTime: Date.now() - 86400000,
  endTime: Date.now() + 7 * 86400000,
  stageProgressType: 'petals_collected',
  tasks: [
    {
      id: 'task_collect_50',
      name: '花瓣收集者',
      description: '累计收集 50 个花瓣',
      icon: '🌸',
      type: 'collect',
      target: 50,
      rewardType: 'score',
      rewardValue: 500,
      rewardDetail: '+500 分'
    },
    {
      id: 'task_synthesis_20',
      name: '合成大师',
      description: '累计合成 20 次',
      icon: '⭐',
      type: 'synthesis',
      target: 20,
      rewardType: 'rare_petal',
      rewardValue: 3,
      rewardDetail: '稀有花瓣 ×3'
    },
    {
      id: 'task_score_3000',
      name: '分数挑战',
      description: '单局获得 3000 分',
      icon: '🏆',
      type: 'score',
      target: 3000,
      rewardType: 'score',
      rewardValue: 1000,
      rewardDetail: '+1000 分'
    },
    {
      id: 'task_rare_5',
      name: '珍稀猎人',
      description: '累计收集 5 个稀有花瓣',
      icon: '💎',
      type: 'rare',
      target: 5,
      rewardType: 'synthesis_bonus',
      rewardValue: 2,
      rewardDetail: '合成加成 ×2'
    },
    {
      id: 'task_region_3',
      name: '探索先锋',
      description: '解锁 3 个区域',
      icon: '🗺️',
      type: 'region',
      target: 3,
      rewardType: 'score',
      rewardValue: 800,
      rewardDetail: '+800 分'
    }
  ],
  stageRewards: [
    {
      id: 'stage_1',
      stage: 1,
      name: '初绽之礼',
      description: '收集 30 花瓣',
      requirement: 30,
      rewardType: 'score',
      rewardValue: 200,
      rewardDetail: '+200 分'
    },
    {
      id: 'stage_2',
      stage: 2,
      name: '盛开花语',
      description: '收集 80 花瓣',
      requirement: 80,
      rewardType: 'rare_petal',
      rewardValue: 2,
      rewardDetail: '稀有花瓣 ×2'
    },
    {
      id: 'stage_3',
      stage: 3,
      name: '花舞梦境',
      description: '收集 150 花瓣',
      requirement: 150,
      rewardType: 'score',
      rewardValue: 1000,
      rewardDetail: '+1000 分'
    },
    {
      id: 'stage_4',
      stage: 4,
      name: '永恒花园',
      description: '收集 250 花瓣',
      requirement: 250,
      rewardType: 'exclusive_title',
      rewardValue: 1,
      rewardDetail: '限定称号·花祭使者'
    }
  ]
};

export enum EmotionState {
  COLLECTING = 'collecting',
  SYNTHESIZING = 'synthesizing',
  NEAR_AWAKENING = 'near_awakening'
}

export type LayerType = 'ambient' | 'bgm';

export interface LayerConfig {
  baseVolume: number;
  fadeDuration: number;
  oscillatorTypes?: OscillatorType[];
  frequencyRange?: [number, number];
  filterFrequency?: number;
  filterQ?: number;
  lfoRate?: number;
  lfoDepth?: number;
}

export interface EmotionAudioConfig {
  ambient: LayerConfig;
  bgm: LayerConfig;
  description: string;
}

export const EMOTION_AUDIO_CONFIGS: Record<EmotionState, EmotionAudioConfig> = {
  [EmotionState.COLLECTING]: {
    ambient: {
      baseVolume: 0.06,
      fadeDuration: 2500,
      oscillatorTypes: ['sine', 'triangle'],
      frequencyRange: [120, 280],
      filterFrequency: 600,
      filterQ: 0.7,
      lfoRate: 0.15,
      lfoDepth: 8
    },
    bgm: {
      baseVolume: 0.05,
      fadeDuration: 3000,
      oscillatorTypes: ['sine'],
      frequencyRange: [262, 523],
      lfoRate: 0.08,
      lfoDepth: 3
    },
    description: '采集态·静谧森林'
  },
  [EmotionState.SYNTHESIZING]: {
    ambient: {
      baseVolume: 0.035,
      fadeDuration: 1800,
      oscillatorTypes: ['triangle', 'sine'],
      frequencyRange: [180, 420],
      filterFrequency: 1200,
      filterQ: 1.2,
      lfoRate: 0.25,
      lfoDepth: 12
    },
    bgm: {
      baseVolume: 0.08,
      fadeDuration: 2200,
      oscillatorTypes: ['triangle', 'sine'],
      frequencyRange: [330, 784],
      lfoRate: 0.12,
      lfoDepth: 5
    },
    description: '合成态·能量涌动'
  },
  [EmotionState.NEAR_AWAKENING]: {
    ambient: {
      baseVolume: 0.025,
      fadeDuration: 1500,
      oscillatorTypes: ['sawtooth', 'triangle'],
      frequencyRange: [220, 560],
      filterFrequency: 2000,
      filterQ: 1.8,
      lfoRate: 0.4,
      lfoDepth: 18
    },
    bgm: {
      baseVolume: 0.11,
      fadeDuration: 1800,
      oscillatorTypes: ['triangle', 'sawtooth', 'sine'],
      frequencyRange: [392, 988],
      lfoRate: 0.18,
      lfoDepth: 8
    },
    description: '濒临唤醒·觉醒高潮'
  }
};

export interface EmotionMetrics {
  awakeProgress: number;
  recentCollectCount: number;
  recentSynthesisCount: number;
  synthesisRate: number;
  collectRate: number;
  elapsedSeconds: number;
}

export interface ActiveLayer {
  state: EmotionState;
  type: LayerType;
  gainNode: GainNode;
  oscillators: OscillatorNode[];
  lfos: OscillatorNode[];
  lfoGains: GainNode[];
  filters?: BiquadFilterNode[];
  noiseSources?: AudioBufferSourceNode[];
  noiseGains?: GainNode[];
  currentVolume: number;
  targetVolume: number;
}

export interface CrossFadeTask {
  layer: ActiveLayer;
  fromVolume: number;
  toVolume: number;
  startTime: number;
  duration: number;
  onComplete?: () => void;
}
