import { SaveData } from '../types';

const SAVE_KEY = 'dream_forest_save_v1';

export class SaveManager {
  private static instance: SaveManager;
  private saveData: SaveData;

  private constructor() {
    this.saveData = this.loadSave();
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  loadSave(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SaveData;
        return {
          bestScore: parsed.bestScore ?? 0,
          bestProgress: parsed.bestProgress ?? 0,
          totalPlayTime: parsed.totalPlayTime ?? 0,
          gamesPlayed: parsed.gamesPlayed ?? 0,
          lastPlayedAt: parsed.lastPlayedAt ?? 0
        };
      }
    } catch (e) {
      console.warn('[SaveManager] 读取存档失败，使用默认存档', e);
    }
    return {
      bestScore: 0,
      bestProgress: 0,
      totalPlayTime: 0,
      gamesPlayed: 0,
      lastPlayedAt: 0
    };
  }

  saveProgress(result: {
    score: number;
    progress: number;
    playTime: number;
    victory: boolean;
  }): void {
    const newBest = {
      bestScore: Math.max(this.saveData.bestScore, result.score),
      bestProgress: Math.max(this.saveData.bestProgress, Math.floor(result.progress)),
      totalPlayTime: this.saveData.totalPlayTime + result.playTime,
      gamesPlayed: this.saveData.gamesPlayed + 1,
      lastPlayedAt: Date.now()
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
      lastPlayedAt: Date.now()
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
}
