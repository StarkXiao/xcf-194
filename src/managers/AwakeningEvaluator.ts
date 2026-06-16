import {
  AwakeningBranch,
  AwakeningEvaluation,
  AwakeningDimensionScore,
  AWAKENING_BRANCH_INFO,
  TITLE_DEFINITIONS,
  PetalTier
} from '../types';

interface AwakeningInput {
  score: number;
  rarePetalsCollected: number;
  highestSynthesisTier: PetalTier;
  synthesisCount: number;
  playTime: number;
  failedSynthesisCount: number;
  missedRareCount: number;
  victory: boolean;
  unlockedRegions: number;
}

const RARITY_ORDER: Record<string, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  common: 3
};

export class AwakeningEvaluator {
  static evaluate(input: AwakeningInput): AwakeningEvaluation {
    const powerScore = AwakeningEvaluator.calcPower(input.score, input.victory);
    const mysticScore = AwakeningEvaluator.calcMystic(input.rarePetalsCollected, input.highestSynthesisTier, input.synthesisCount);
    const speedScore = AwakeningEvaluator.calcSpeed(input.playTime, input.victory);
    const perfectionScore = AwakeningEvaluator.calcPerfection(input.failedSynthesisCount, input.missedRareCount, input.victory);

    const branchScores: AwakeningDimensionScore[] = [
      AwakeningEvaluator.buildBranch('power', powerScore),
      AwakeningEvaluator.buildBranch('mystic', mysticScore),
      AwakeningEvaluator.buildBranch('speed', speedScore),
      AwakeningEvaluator.buildBranch('perfection', perfectionScore)
    ];

    let primaryBranch: AwakeningBranch = 'power';
    let maxScore = powerScore;
    branchScores.forEach(bs => {
      if (bs.score > maxScore) {
        maxScore = bs.score;
        primaryBranch = bs.branch;
      }
    });

    if (!input.victory) {
      primaryBranch = input.unlockedRegions >= 3 ? 'mystic' : 'speed';
    }

    const compositeScore = Math.round(
      powerScore * 0.3 + mysticScore * 0.25 + speedScore * 0.25 + perfectionScore * 0.2
    );

    const title = AwakeningEvaluator.resolveTitle(primaryBranch, branchScores, input, compositeScore);

    return {
      primaryBranch,
      branchScores,
      title: title.title,
      titleRarity: title.rarity,
      titleIcon: title.icon,
      titleColor: title.color,
      compositeScore
    };
  }

  private static calcPower(score: number, victory: boolean): number {
    if (!victory) return Math.min(score / 50, 40);
    let s = 30;
    if (score >= 5000) s += 40;
    else if (score >= 3000) s += 28;
    else if (score >= 1500) s += 16;
    else s += 8;
    s += Math.min(score / 200, 30);
    return Math.min(100, s);
  }

  private static calcMystic(rareCollected: number, highestTier: number, synthesisCount: number): number {
    let s = 0;
    s += Math.min(rareCollected * 8, 35);
    s += Math.min((highestTier - 1) * 15, 30);
    s += Math.min(synthesisCount * 1.5, 35);
    return Math.min(100, s);
  }

  private static calcSpeed(playTime: number, victory: boolean): number {
    if (!victory) return Math.max(0, 20 - playTime / 30);
    const minutes = playTime / 60;
    if (minutes <= 3) return 100;
    if (minutes <= 5) return 80 + (5 - minutes) * 10;
    if (minutes <= 8) return 55 + (8 - minutes) * 8.33;
    if (minutes <= 12) return 30 + (12 - minutes) * 6.25;
    return Math.max(10, 30 - (minutes - 12) * 2);
  }

  private static calcPerfection(failedSynthesis: number, missedRare: number, victory: boolean): number {
    if (!victory) return 0;
    let s = 70;
    s -= failedSynthesis * 10;
    s -= missedRare * 8;
    if (failedSynthesis === 0 && missedRare === 0) s += 30;
    return Math.max(0, Math.min(100, s));
  }

  private static buildBranch(branch: AwakeningBranch, score: number): AwakeningDimensionScore {
    const info = AWAKENING_BRANCH_INFO[branch];
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    let grade: 'S' | 'A' | 'B' | 'C';
    let label: string;
    let description: string;

    if (clamped >= 85) { grade = 'S'; label = 'SS+'; description = '登峰造极'; }
    else if (clamped >= 70) { grade = 'A'; label = 'S'; description = '出类拔萃'; }
    else if (clamped >= 45) { grade = 'B'; label = 'A'; description = '崭露头角'; }
    else { grade = 'C'; label = 'B'; description = '初学乍练'; }

    return { branch, score: clamped, grade, label, description, icon: info.icon, color: info.color };
  }

  private static resolveTitle(
    primaryBranch: AwakeningBranch,
    branchScores: AwakeningDimensionScore[],
    params: AwakeningInput,
    _compositeScore: number
  ): { title: string; rarity: 'legendary' | 'epic' | 'rare' | 'common'; icon: string; color: string } {
    const primaryScore = branchScores.find(b => b.branch === primaryBranch);

    if (params.victory) {
      if (primaryScore && primaryScore.grade === 'S') {
        if (primaryBranch === 'power' && params.score >= 5000) return TITLE_DEFINITIONS[0];
        if (primaryBranch === 'mystic' && params.rarePetalsCollected >= 8) return TITLE_DEFINITIONS[1];
        if (primaryBranch === 'speed' && params.playTime <= 180) return TITLE_DEFINITIONS[2];
        if (primaryBranch === 'perfection' && params.failedSynthesisCount === 0 && params.missedRareCount === 0) return TITLE_DEFINITIONS[3];
      }

      if (primaryScore && primaryScore.grade === 'A') {
        if (primaryBranch === 'power' && params.score >= 3000) return TITLE_DEFINITIONS[4];
        if (primaryBranch === 'mystic' && params.rarePetalsCollected >= 5) return TITLE_DEFINITIONS[5];
        if (primaryBranch === 'speed' && params.playTime <= 300) return TITLE_DEFINITIONS[6];
        if (primaryBranch === 'perfection' && params.failedSynthesisCount + params.missedRareCount <= 1) return TITLE_DEFINITIONS[7];
      }

      if (primaryScore && primaryScore.grade === 'B') {
        const idx = [8, 9, 10, 11][['power', 'mystic', 'speed', 'perfection'].indexOf(primaryBranch)];
        if (idx !== undefined) return TITLE_DEFINITIONS[idx];
      }

      return TITLE_DEFINITIONS[12];
    }

    if (params.unlockedRegions >= 3) return TITLE_DEFINITIONS[13];
    return TITLE_DEFINITIONS[14];
  }
}

export const GRADE_COLORS: Record<string, string> = {
  'SS+': '#fde68a',
  S: '#34d399',
  A: '#7dd3fc',
  B: '#c4b5fd',
  C: '#9ca3af'
};
