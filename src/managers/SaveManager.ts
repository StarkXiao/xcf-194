import { SaveData, GameSaveData, GameState, SAVE_VERSION, Petal, InventoryItem, ReplayData } from '../types';

const SAVE_KEY = 'dream_forest_save_v1';
const GAME_STATE_KEY = 'dream_forest_game_state_v1';

export class SaveManager {
  private static instance: SaveManager;
  private saveData: SaveData;
  private currentVersion: string = SAVE_VERSION;

  private constructor() {
    this.saveData = this.loadSave();
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  getVersion(): string {
    return this.currentVersion;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] ?? 0;
      const p2 = parts2[i] ?? 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  private migrateSaveData(data: any, version: string): SaveData {
    const result: SaveData = {
      bestScore: data.bestScore ?? 0,
      bestProgress: data.bestProgress ?? 0,
      totalPlayTime: data.totalPlayTime ?? 0,
      gamesPlayed: data.gamesPlayed ?? 0,
      lastPlayedAt: data.lastPlayedAt ?? 0,
      version: this.currentVersion,
      totalPetalsCollected: data.totalPetalsCollected ?? 0,
      totalSynthesisCount: data.totalSynthesisCount ?? 0,
      totalRareCollected: data.totalRareCollected ?? 0,
      bestEfficiency: data.bestEfficiency ?? 0,
      eventBonusScore: data.eventBonusScore ?? 0,
      eventRarePetals: data.eventRarePetals ?? 0,
      eventTitles: data.eventTitles ?? [],
      eventSynthesisBonus: data.eventSynthesisBonus ?? 0
    };

    if (this.compareVersions(version, '1.1.0') < 0) {
      console.log('[SaveManager] 存档数据从版本', version, '迁移到', this.currentVersion);
    }

    return result;
  }

  loadSave(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as any;
        const version = parsed.version ?? '1.0.0';
        return this.migrateSaveData(parsed, version);
      }
    } catch (e) {
      console.warn('[SaveManager] 读取存档失败，使用默认存档', e);
    }
    return {
      bestScore: 0,
      bestProgress: 0,
      totalPlayTime: 0,
      gamesPlayed: 0,
      lastPlayedAt: 0,
      version: this.currentVersion,
      totalPetalsCollected: 0,
      totalSynthesisCount: 0,
      totalRareCollected: 0,
      bestEfficiency: 0,
      eventBonusScore: 0,
      eventRarePetals: 0,
      eventTitles: [],
      eventSynthesisBonus: 0
    };
  }

  saveProgress(result: {
    score: number;
    progress: number;
    playTime: number;
    victory: boolean;
    petalsCollected?: number;
    synthesisCount?: number;
    rareCollected?: number;
    efficiencyScore?: number;
  }): void {
    const newBest = {
      bestScore: Math.max(this.saveData.bestScore, result.score),
      bestProgress: Math.max(this.saveData.bestProgress, Math.floor(result.progress)),
      totalPlayTime: this.saveData.totalPlayTime + result.playTime,
      gamesPlayed: this.saveData.gamesPlayed + 1,
      lastPlayedAt: Date.now(),
      version: this.currentVersion,
      totalPetalsCollected: this.saveData.totalPetalsCollected + (result.petalsCollected ?? 0),
      totalSynthesisCount: this.saveData.totalSynthesisCount + (result.synthesisCount ?? 0),
      totalRareCollected: this.saveData.totalRareCollected + (result.rareCollected ?? 0),
      bestEfficiency: Math.max(this.saveData.bestEfficiency, result.efficiencyScore ?? 0),
      eventBonusScore: this.saveData.eventBonusScore,
      eventRarePetals: this.saveData.eventRarePetals,
      eventTitles: [...this.saveData.eventTitles],
      eventSynthesisBonus: this.saveData.eventSynthesisBonus
    };

    this.saveData = newBest;

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(newBest));
    } catch (e) {
      console.warn('[SaveManager] 保存存档失败', e);
    }
  }

  resetSave(): void {
    this.saveData = {
      bestScore: 0,
      bestProgress: 0,
      totalPlayTime: 0,
      gamesPlayed: 0,
      lastPlayedAt: Date.now(),
      version: this.currentVersion,
      totalPetalsCollected: 0,
      totalSynthesisCount: 0,
      totalRareCollected: 0,
      bestEfficiency: 0,
      eventBonusScore: 0,
      eventRarePetals: 0,
      eventTitles: [],
      eventSynthesisBonus: 0
    };
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('[SaveManager] 重置存档失败', e);
    }
  }

  getCurrentSave(): SaveData {
    return { ...this.saveData };
  }

  addEventBonusScore(score: number): void {
    this.saveData.eventBonusScore += score;
    this.persistSave();
    console.log('[SaveManager] 活动奖励分数已增加:', score, '总计:', this.saveData.eventBonusScore);
  }

  addEventRarePetals(count: number): void {
    this.saveData.eventRarePetals += count;
    this.saveData.totalRareCollected += count;
    this.persistSave();
    console.log('[SaveManager] 活动稀有花瓣已增加:', count, '总计:', this.saveData.eventRarePetals);
  }

  addEventTitle(title: string): void {
    if (!this.saveData.eventTitles.includes(title)) {
      this.saveData.eventTitles.push(title);
      this.persistSave();
      console.log('[SaveManager] 活动称号已获得:', title);
    }
  }

  addEventSynthesisBonus(bonus: number): void {
    this.saveData.eventSynthesisBonus += bonus;
    this.persistSave();
    console.log('[SaveManager] 活动合成加成已增加:', bonus, '总计:', this.saveData.eventSynthesisBonus);
  }

  getEventSynthesisBonus(): number {
    return this.saveData.eventSynthesisBonus;
  }

  private persistSave(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveData));
    } catch (e) {
      console.warn('[SaveManager] 持久化存档失败', e);
    }
  }

  saveGameState(gameState: GameState, petals: Petal[]): boolean {
    try {
      const gameSaveData: GameSaveData = {
        gameState: {
          ...gameState,
          inventory: this.validateInventory(gameState.inventory),
          petals: this.validatePetals(petals)
        },
        savedAt: Date.now(),
        version: this.currentVersion
      };

      localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameSaveData));
      console.log('[SaveManager] 游戏状态已保存，版本:', this.currentVersion);
      return true;
    } catch (e) {
      console.warn('[SaveManager] 保存游戏状态失败', e);
      return false;
    }
  }

  loadGameState(): { gameState: GameState; petals: Petal[] } | null {
    try {
      const raw = localStorage.getItem(GAME_STATE_KEY);
      if (!raw) {
        console.log('[SaveManager] 没有找到游戏存档');
        return null;
      }

      const parsed = JSON.parse(raw) as GameSaveData;
      const savedVersion = parsed.version ?? '1.0.0';

      const migrated = this.migrateGameState(parsed, savedVersion);

      console.log('[SaveManager] 游戏状态已加载，版本:', savedVersion, '→', this.currentVersion);
      return {
        gameState: migrated.gameState,
        petals: migrated.gameState.petals
      };
    } catch (e) {
      console.warn('[SaveManager] 加载游戏状态失败', e);
      return null;
    }
  }

  private migrateGameState(data: GameSaveData, version: string): GameSaveData {
    const result: GameSaveData = {
      ...data,
      version: this.currentVersion,
      gameState: {
        ...data.gameState,
        inventory: this.validateInventory(data.gameState.inventory),
        petals: this.validatePetals(data.gameState.petals)
      }
    };

    if (this.compareVersions(version, '1.1.0') < 0) {
      console.log('[SaveManager] 游戏状态从版本', version, '迁移到', this.currentVersion);

      if (!result.gameState.synthesisCount) {
        result.gameState.synthesisCount = 0;
      }

      if (!result.gameState.unlockedRegions) {
        result.gameState.unlockedRegions = ['initial'];
      }

      if (typeof result.gameState.rarePetalsCollected !== 'number') {
        result.gameState.rarePetalsCollected = 0;
      }
    }

    return result;
  }

  private validateInventory(inventory: InventoryItem[]): InventoryItem[] {
    const validTiers = [1, 2, 3, 4, 5];
    const validColors = ['pink', 'blue', 'purple', 'gold', 'rainbow'];
    const seen = new Map<string, InventoryItem>();

    for (const item of inventory) {
      if (!validTiers.includes(item.tier) ||
          !validColors.includes(item.color) ||
          typeof item.count !== 'number' ||
          item.count <= 0) {
        continue;
      }

      const key = `${item.tier}-${item.color}`;
      if (seen.has(key)) {
        seen.get(key)!.count += item.count;
      } else {
        seen.set(key, { ...item });
      }
    }

    return Array.from(seen.values()).sort((a, b) => {
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.tier - b.tier;
    });
  }

  private validatePetals(petals: Petal[]): Petal[] {
    const validTiers = [1, 2, 3, 4, 5];
    const validColors = ['pink', 'blue', 'purple', 'gold', 'rainbow'];

    return petals.filter(petal =>
      validTiers.includes(petal.tier) &&
      validColors.includes(petal.color) &&
      typeof petal.x === 'number' &&
      typeof petal.y === 'number' &&
      !petal.collected
    );
  }

  hasGameState(): boolean {
    try {
      return localStorage.getItem(GAME_STATE_KEY) !== null;
    } catch {
      return false;
    }
  }

  clearGameState(): void {
    try {
      localStorage.removeItem(GAME_STATE_KEY);
      console.log('[SaveManager] 游戏状态存档已清除');
    } catch (e) {
      console.warn('[SaveManager] 清除游戏状态失败', e);
    }
  }

  getGameStateInfo(): { savedAt: number; version: string } | null {
    try {
      const raw = localStorage.getItem(GAME_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameSaveData;
      return {
        savedAt: parsed.savedAt,
        version: parsed.version
      };
    } catch {
      return null;
    }
  }

  exportAllData(): { saveData: SaveData; gameState?: GameSaveData } {
    const result: { saveData: SaveData; gameState?: GameSaveData } = {
      saveData: this.getCurrentSave()
    };

    try {
      const raw = localStorage.getItem(GAME_STATE_KEY);
      if (raw) {
        result.gameState = JSON.parse(raw);
      }
    } catch {}

    return result;
  }

  importAllData(data: { saveData: SaveData; gameState?: GameSaveData }): boolean {
    try {
      if (data.saveData) {
        this.saveData = this.migrateSaveData(data.saveData, data.saveData.version ?? '1.0.0');
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveData));
      }

      if (data.gameState) {
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(data.gameState));
      }

      return true;
    } catch (e) {
      console.warn('[SaveManager] 导入数据失败', e);
      return false;
    }
  }

  resetAll(): void {
    this.resetSave();
    this.clearGameState();
  }

  generateShareText(replayData: ReplayData, score: number, progress: number, playTime: number, victory: boolean): string {
    const timeStr = `${Math.floor(playTime / 60)}:${(playTime % 60).toString().padStart(2, '0')}`;
    const lines: string[] = [
      '🌸 梦境森林 · 局内复盘 🌸',
      `━━━━━━━━━━━━━━━━`,
      `${victory ? '🎉 恋人已苏醒！' : '🌙 旅程暂告段落'}`,
      `✨ 分数: ${score}  💖 进度: ${Math.floor(progress)}%`,
      `⏱ 时长: ${timeStr}`,
      '',
      `📊 效率评分: ${replayData.efficiencyScore.toFixed(0)}`,
      `🌸 采集效率: ${replayData.collectionRate.toFixed(1)} 朵/分`,
      `⭐ 最高合成: Lv.${replayData.highestSynthesisTier}`,
      '',
      '🎨 花瓣采集:'
    ];
    replayData.petalsByColor.forEach(p => {
      lines.push(`  ${p.color === 'pink' ? '🩷' : p.color === 'blue' ? '💙' : p.color === 'purple' ? '💜' : p.color === 'gold' ? '💛' : '🌈'} ${p.color} ×${p.count}`);
    });
    lines.push('', '🎁 奖励来源:');
    replayData.rewardSources.forEach(r => {
      lines.push(`  ${r.label}: ${r.score}`);
    });
    lines.push('', '#梦境森林 #花瓣之约');
    return lines.join('\n');
  }

  copyToClipboard(text: string): boolean {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        return true;
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e) {
      console.warn('[SaveManager] 复制到剪贴板失败', e);
      return false;
    }
  }
}
