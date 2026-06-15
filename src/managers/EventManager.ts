import {
  EventConfig,
  EventProgress,
  EventTaskProgress,
  EventStageProgress,
  EventSaveData,
  EventTask,
  EventStageReward,
  DEFAULT_EVENT_CONFIG,
  EventRewardType
} from '../types';

const EVENT_SAVE_KEY = 'dream_forest_event_v1';

export class EventManager {
  private static instance: EventManager;
  private currentEvent: EventConfig | null = null;
  private eventProgress: EventProgress | null = null;
  private saveData: EventSaveData;

  private constructor() {
    this.saveData = this.loadSaveData();
    this.initializeCurrentEvent();
  }

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  private loadSaveData(): EventSaveData {
    try {
      const raw = localStorage.getItem(EVENT_SAVE_KEY);
      if (raw) {
        return JSON.parse(raw) as EventSaveData;
      }
    } catch (e) {
      console.warn('[EventManager] 读取活动存档失败', e);
    }
    return {
      currentEventId: null,
      events: {},
      claimedRewards: []
    };
  }

  private saveSaveData(): void {
    try {
      localStorage.setItem(EVENT_SAVE_KEY, JSON.stringify(this.saveData));
    } catch (e) {
      console.warn('[EventManager] 保存活动存档失败', e);
    }
  }

  private initializeCurrentEvent(): void {
    const config = DEFAULT_EVENT_CONFIG;
    const now = Date.now();

    if (now >= config.startTime && now <= config.endTime) {
      this.currentEvent = config;

      if (!this.saveData.events[config.id]) {
        this.saveData.events[config.id] = this.createInitialProgress(config);
        this.saveData.currentEventId = config.id;
        this.saveSaveData();
      }

      this.eventProgress = this.saveData.events[config.id];
    } else {
      this.currentEvent = null;
      this.eventProgress = null;
    }
  }

  private createInitialProgress(config: EventConfig): EventProgress {
    const taskProgress: EventTaskProgress[] = config.tasks.map(task => ({
      taskId: task.id,
      current: 0,
      claimed: false,
      completed: false
    }));

    const stageProgress: EventStageProgress[] = config.stageRewards.map(stage => ({
      stageId: stage.id,
      claimed: false,
      completed: false
    }));

    return {
      eventId: config.id,
      totalScore: 0,
      totalPetalsCollected: 0,
      totalSynthesisCount: 0,
      taskProgress,
      stageProgress,
      lastUpdated: Date.now()
    };
  }

  getCurrentEvent(): EventConfig | null {
    return this.currentEvent;
  }

  getEventProgress(): EventProgress | null {
    return this.eventProgress;
  }

  isEventActive(): boolean {
    if (!this.currentEvent) return false;
    const now = Date.now();
    return now >= this.currentEvent.startTime && now <= this.currentEvent.endTime;
  }

  getTimeRemaining(): number {
    if (!this.currentEvent) return 0;
    const now = Date.now();
    return Math.max(0, this.currentEvent.endTime - now);
  }

  formatTimeRemaining(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}天 ${hours}时 ${minutes}分`;
    } else if (hours > 0) {
      return `${hours}时 ${minutes}分 ${seconds}秒`;
    } else {
      return `${minutes}分 ${seconds}秒`;
    }
  }

  getTaskProgress(taskId: string): EventTaskProgress | null {
    if (!this.eventProgress) return null;
    return this.eventProgress.taskProgress.find(t => t.taskId === taskId) || null;
  }

  getStageProgress(stageId: string): EventStageProgress | null {
    if (!this.eventProgress) return null;
    return this.eventProgress.stageProgress.find(s => s.stageId === stageId) || null;
  }

  getStageProgressValue(): number {
    if (!this.currentEvent || !this.eventProgress) return 0;

    switch (this.currentEvent.stageProgressType) {
      case 'score':
        return this.eventProgress.totalScore;
      case 'petals_collected':
        return this.eventProgress.totalPetalsCollected;
      case 'synthesis_count':
        return this.eventProgress.totalSynthesisCount;
      default:
        return 0;
    }
  }

  getCurrentStage(): number {
    if (!this.currentEvent || !this.eventProgress) return 0;

    const progress = this.getStageProgressValue();
    let currentStage = 0;

    for (const stage of this.currentEvent.stageRewards) {
      if (progress >= stage.requirement) {
        currentStage = stage.stage;
      }
    }

    return currentStage;
  }

  updateTaskProgress(taskType: string, value: number): void {
    if (!this.currentEvent || !this.eventProgress || !this.isEventActive()) return;

    this.eventProgress.taskProgress.forEach(taskProg => {
      const task = this.currentEvent!.tasks.find(t => t.id === taskProg.taskId);
      if (!task) return;

      if (task.type === taskType && !taskProg.completed) {
        if (taskType === 'score') {
          taskProg.current = Math.max(taskProg.current, value);
        } else {
          taskProg.current = Math.min(taskProg.current + value, task.target);
        }

        if (taskProg.current >= task.target) {
          taskProg.completed = true;
          taskProg.current = task.target;
          console.log('[EventManager] 任务完成:', task.name);
        }
      }
    });

    this.eventProgress.lastUpdated = Date.now();
    this.updateStageProgress();
    this.saveSaveData();
  }

  private updateStageProgress(): void {
    if (!this.currentEvent || !this.eventProgress) return;

    const progress = this.getStageProgressValue();

    this.eventProgress.stageProgress.forEach(stageProg => {
      const stage = this.currentEvent!.stageRewards.find(s => s.id === stageProg.stageId);
      if (!stage) return;

      if (!stageProg.completed && progress >= stage.requirement) {
        stageProg.completed = true;
        console.log('[EventManager] 阶段达成:', stage.name);
      }
    });
  }

  recordGameResult(data: {
    score: number;
    petalsCollected: number;
    synthesisCount: number;
    rareCollected: number;
    regionsUnlocked: number;
    playTime: number;
  }): void {
    if (!this.currentEvent || !this.eventProgress || !this.isEventActive()) return;

    this.eventProgress.totalScore = Math.max(this.eventProgress.totalScore, data.score);
    this.eventProgress.totalPetalsCollected += data.petalsCollected;
    this.eventProgress.totalSynthesisCount += data.synthesisCount;

    this.updateTaskProgress('collect', data.petalsCollected);
    this.updateTaskProgress('synthesis', data.synthesisCount);
    this.updateTaskProgress('score', data.score);
    this.updateTaskProgress('rare', data.rareCollected);
    this.updateTaskProgress('region', data.regionsUnlocked);
    this.updateTaskProgress('play_time', Math.floor(data.playTime / 60));

    this.updateStageProgress();
    this.saveSaveData();
  }

  claimTaskReward(taskId: string): { success: boolean; reward?: { type: EventRewardType; value: number; detail?: string } } {
    if (!this.currentEvent || !this.eventProgress) {
      return { success: false };
    }

    const taskProg = this.eventProgress.taskProgress.find(t => t.taskId === taskId);
    if (!taskProg || !taskProg.completed || taskProg.claimed) {
      return { success: false };
    }

    const task = this.currentEvent.tasks.find(t => t.id === taskId);
    if (!task) return { success: false };

    taskProg.claimed = true;
    this.saveSaveData();

    console.log('[EventManager] 领取任务奖励:', task.name, task.rewardDetail);

    return {
      success: true,
      reward: {
        type: task.rewardType,
        value: task.rewardValue,
        detail: task.rewardDetail
      }
    };
  }

  claimStageReward(stageId: string): { success: boolean; reward?: { type: EventRewardType; value: number; detail?: string } } {
    if (!this.currentEvent || !this.eventProgress) {
      return { success: false };
    }

    const stageProg = this.eventProgress.stageProgress.find(s => s.stageId === stageId);
    if (!stageProg || !stageProg.completed || stageProg.claimed) {
      return { success: false };
    }

    const stage = this.currentEvent.stageRewards.find(s => s.id === stageId);
    if (!stage) return { success: false };

    stageProg.claimed = true;
    this.saveSaveData();

    console.log('[EventManager] 领取阶段奖励:', stage.name, stage.rewardDetail);

    return {
      success: true,
      reward: {
        type: stage.rewardType,
        value: stage.rewardValue,
        detail: stage.rewardDetail
      }
    };
  }

  hasUnclaimedRewards(): boolean {
    if (!this.currentEvent || !this.eventProgress) return false;

    const hasUnclaimedTasks = this.eventProgress.taskProgress.some(
      t => t.completed && !t.claimed
    );
    const hasUnclaimedStages = this.eventProgress.stageProgress.some(
      s => s.completed && !s.claimed
    );

    return hasUnclaimedTasks || hasUnclaimedStages;
  }

  getCompletedTaskCount(): number {
    if (!this.eventProgress) return 0;
    return this.eventProgress.taskProgress.filter(t => t.completed).length;
  }

  getTotalTaskCount(): number {
    if (!this.currentEvent) return 0;
    return this.currentEvent.tasks.length;
  }

  getTotalStageCount(): number {
    if (!this.currentEvent) return 0;
    return this.currentEvent.stageRewards.length;
  }

  resetEventProgress(): void {
    if (!this.currentEvent) return;

    this.saveData.events[this.currentEvent.id] = this.createInitialProgress(this.currentEvent);
    this.eventProgress = this.saveData.events[this.currentEvent.id];
    this.saveSaveData();
  }
}
