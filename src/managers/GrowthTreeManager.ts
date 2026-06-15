import {
  SaveData,
  GrowthNode,
  GrowthNodeId,
  GrowthTreeSaveData,
  GROWTH_TREE_NODES,
  PermanentBonuses,
  GrowthNodeRequirementType
} from '../types';

const DEFAULT_GROWTH_TREE: GrowthTreeSaveData = {
  unlockedNodes: [],
  newUnlockedNodes: [],
  lastCheckedAt: 0
};

export class GrowthTreeManager {
  private static instance: GrowthTreeManager;

  private constructor() {}

  static getInstance(): GrowthTreeManager {
    if (!GrowthTreeManager.instance) {
      GrowthTreeManager.instance = new GrowthTreeManager();
    }
    return GrowthTreeManager.instance;
  }

  getDefaultGrowthTree(): GrowthTreeSaveData {
    return { ...DEFAULT_GROWTH_TREE, unlockedNodes: [], newUnlockedNodes: [] };
  }

  getRequirementValue(saveData: SaveData, reqType: GrowthNodeRequirementType): number {
    switch (reqType) {
      case 'gamesPlayed':
        return saveData.gamesPlayed;
      case 'totalPetalsCollected':
        return saveData.totalPetalsCollected;
      case 'totalSynthesisCount':
        return saveData.totalSynthesisCount;
      case 'totalRareCollected':
        return saveData.totalRareCollected;
      case 'bestScore':
        return saveData.bestScore;
      case 'totalPlayTime':
        return saveData.totalPlayTime;
      case 'bestProgress':
        return saveData.bestProgress;
      default:
        return 0;
    }
  }

  getRequirementLabel(reqType: GrowthNodeRequirementType): string {
    const labels: Record<GrowthNodeRequirementType, string> = {
      gamesPlayed: '游戏局数',
      totalPetalsCollected: '累计花瓣',
      totalSynthesisCount: '累计合成',
      totalRareCollected: '稀有花瓣',
      bestScore: '最高分',
      totalPlayTime: '累计时长(秒)',
      bestProgress: '最佳进度(%)'
    };
    return labels[reqType];
  }

  isNodeUnlocked(node: GrowthNode, saveData: SaveData): boolean {
    const prereqsMet = node.prerequisites.every(
      prereqId => saveData.growthTree.unlockedNodes.includes(prereqId)
    );
    if (!prereqsMet) return false;

    const currentValue = this.getRequirementValue(saveData, node.requirementType);
    return currentValue >= node.requirementValue;
  }

  checkAndUnlockNodes(saveData: SaveData): GrowthNode[] {
    const newlyUnlocked: GrowthNode[] = [];
    const unlockedSet = new Set(saveData.growthTree.unlockedNodes);
    let changed = true;

    while (changed) {
      changed = false;
      for (const node of GROWTH_TREE_NODES) {
        if (unlockedSet.has(node.id)) continue;
        if (this.isNodeUnlocked(node, saveData)) {
          unlockedSet.add(node.id);
          newlyUnlocked.push(node);
          changed = true;
        }
      }
    }

    saveData.growthTree.unlockedNodes = Array.from(unlockedSet);
    if (newlyUnlocked.length > 0) {
      saveData.growthTree.newUnlockedNodes = [
        ...saveData.growthTree.newUnlockedNodes,
        ...newlyUnlocked.map(n => n.id)
      ];
      saveData.growthTree.lastCheckedAt = Date.now();
      console.log('[GrowthTreeManager] 新解锁成长节点:', newlyUnlocked.map(n => n.name).join(', '));
    }

    return newlyUnlocked;
  }

  clearNewUnlocked(saveData: SaveData): void {
    saveData.growthTree.newUnlockedNodes = [];
  }

  getNodeById(id: GrowthNodeId): GrowthNode | undefined {
    return GROWTH_TREE_NODES.find(n => n.id === id);
  }

  getAllNodes(): GrowthNode[] {
    return [...GROWTH_TREE_NODES];
  }

  getUnlockedNodes(saveData: SaveData): GrowthNode[] {
    return GROWTH_TREE_NODES.filter(n => saveData.growthTree.unlockedNodes.includes(n.id));
  }

  getNewUnlockedNodes(saveData: SaveData): GrowthNode[] {
    return saveData.growthTree.newUnlockedNodes
      .map(id => this.getNodeById(id))
      .filter((n): n is GrowthNode => n !== undefined);
  }

  hasNewUnlocked(saveData: SaveData): boolean {
    return saveData.growthTree.newUnlockedNodes.length > 0;
  }

  calculatePermanentBonuses(saveData: SaveData): PermanentBonuses {
    const bonuses: PermanentBonuses = {
      scoreMultiplier: 1,
      petalValueBonus: 0,
      rareChanceBonus: 0,
      synthesisScoreBonus: 0,
      startPetals: 0,
      progressBonus: 0,
      efficiencyBonus: 0,
      autoFeedStartEnabled: false,
      collectRadiusBonus: 0,
      spawnRateBonus: 0,
      maxPetalsBonus: 0
    };

    const unlocked = this.getUnlockedNodes(saveData);
    for (const node of unlocked) {
      switch (node.rewardType) {
        case 'scoreMultiplier':
          bonuses.scoreMultiplier += node.rewardValue;
          break;
        case 'petalValueBonus':
          bonuses.petalValueBonus += node.rewardValue;
          break;
        case 'rareChanceBonus':
          bonuses.rareChanceBonus += node.rewardValue;
          break;
        case 'synthesisScoreBonus':
          bonuses.synthesisScoreBonus += node.rewardValue;
          break;
        case 'startPetals':
          bonuses.startPetals += node.rewardValue;
          break;
        case 'progressBonus':
          bonuses.progressBonus += node.rewardValue;
          break;
        case 'efficiencyBonus':
          bonuses.efficiencyBonus += node.rewardValue;
          break;
        case 'autoFeedStart':
          bonuses.autoFeedStartEnabled = true;
          break;
        case 'collectRadiusBonus':
          bonuses.collectRadiusBonus += node.rewardValue;
          break;
        case 'spawnRateBonus':
          bonuses.spawnRateBonus += node.rewardValue;
          break;
        case 'maxPetalsBonus':
          bonuses.maxPetalsBonus += node.rewardValue;
          break;
      }
    }

    bonuses.scoreMultiplier += bonuses.efficiencyBonus;
    return bonuses;
  }

  getNodeProgress(node: GrowthNode, saveData: SaveData): { current: number; required: number; percent: number } {
    const current = this.getRequirementValue(saveData, node.requirementType);
    const required = node.requirementValue;
    const percent = Math.min(100, Math.floor((current / required) * 100));
    return { current, required, percent };
  }

  canUnlockSoon(node: GrowthNode, saveData: SaveData): boolean {
    if (saveData.growthTree.unlockedNodes.includes(node.id)) return false;
    const { percent } = this.getNodeProgress(node, saveData);
    return percent >= 70;
  }

  getNodesByBranch(branch: 'collector' | 'synthesizer' | 'explorer'): GrowthNode[] {
    return GROWTH_TREE_NODES.filter(n => n.branch === branch).sort((a, b) => a.tier - b.tier);
  }
}
