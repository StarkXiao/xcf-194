import {
  InventoryItem,
  PetalTier,
  PetalColor,
  PetalVariant,
  PETAL_TIER_NAMES,
  SynthesisRecipe,
  MutationRecipe,
  Petal,
  SynthesisQueueItem,
  ContinuousSynthesisResult,
  AutoFeedResult,
  InventoryValidationResult,
  MUTATION_RECIPES_CONFIG,
  PETAL_VARIANT_NAMES,
  Petal as PetalType,
  TargetGoal,
  MaterialShortage,
  RecentOutput,
  RecommendedRoute,
  TargetTrackingData,
  TargetType,
  RouteStep
} from '../types';

export interface SynthesisResult {
  success: boolean;
  output?: { tier: PetalTier; color: PetalColor; variant?: PetalVariant; count: number };
  message?: string;
}

export interface MutationResult {
  success: boolean;
  output?: { tier: PetalTier; color: PetalColor; variant: PetalVariant; count: number };
  message?: string;
}

export class SynthesisSystem {
  private inventory: InventoryItem[] = [];
  private recipes: SynthesisRecipe[] = [];
  private mutationRecipes: MutationRecipe[] = [];
  private synthesisQueue: SynthesisQueueItem[] = [];
  private autoFeedEnabled: boolean = true;
  private pendingPetals: PetalType[] = [];
  private mutationCount: number = 0;
  private recentOutputs: RecentOutput[] = [];
  private activeGoal: TargetGoal | null = null;
  private availableGoals: TargetGoal[] = [];
  private readonly MAX_RECENT_OUTPUTS = 10;

  constructor() {
    this.initializeRecipes();
    this.initializeMutationRecipes();
  }

  private initializeRecipes(): void {
    const colors: PetalColor[] = ['pink', 'blue', 'purple', 'gold'];
    const tiers1to4: PetalTier[] = [1, 2, 3, 4];
    colors.forEach(color => {
      tiers1to4.forEach((tier) => {
        const nextTier = (tier + 1) as PetalTier;
        this.recipes.push({
          input: [{ tier: tier as PetalTier, color, count: 3 }],
          output: { tier: nextTier as PetalTier, color, count: 1 },
          name: `${PETAL_TIER_NAMES[tier as PetalTier]}(${color})×3 → ${PETAL_TIER_NAMES[nextTier as PetalTier]}(${color})`
        });
      });
    });

    this.recipes.push({
      input: [
        { tier: 1, color: 'pink', count: 1 },
        { tier: 1, color: 'blue', count: 1 },
        { tier: 1, color: 'purple', count: 1 }
      ],
      output: { tier: 2, color: 'rainbow', count: 1 },
      name: '三色花瓣合成彩虹花瓣'
    });

    const tiers2to4: PetalTier[] = [2, 3, 4];
    tiers2to4.forEach((tier) => {
      const nextTier = (tier + 1) as PetalTier;
      this.recipes.push({
        input: [{ tier: tier as PetalTier, color: 'rainbow', count: 2 }],
        output: { tier: nextTier as PetalTier, color: 'rainbow', count: 1 },
        name: `彩虹${PETAL_TIER_NAMES[tier as PetalTier]}×2 → ${PETAL_TIER_NAMES[nextTier as PetalTier]}`
      });
    });
  }

  private initializeMutationRecipes(): void {
    const tiers: PetalTier[] = [1, 2, 3, 4];
    tiers.forEach(tier => {
      const nextTier = (tier + 1) as PetalTier;
      MUTATION_RECIPES_CONFIG.forEach(config => {
        this.mutationRecipes.push({
          colorA: config.colorA,
          colorB: config.colorB,
          variant: config.variant,
          tier,
          outputColor: config.colorA,
          outputTier: nextTier,
          name: `${PETAL_TIER_NAMES[tier]}·${config.name} → ${PETAL_VARIANT_NAMES[config.variant]}${PETAL_TIER_NAMES[nextTier]}(${config.colorA})`
        });
        this.mutationRecipes.push({
          colorA: config.colorA,
          colorB: config.colorB,
          variant: config.variant,
          tier,
          outputColor: config.colorB,
          outputTier: nextTier,
          name: `${PETAL_TIER_NAMES[tier]}·${config.name} → ${PETAL_VARIANT_NAMES[config.variant]}${PETAL_TIER_NAMES[nextTier]}(${config.colorB})`
        });
        this.mutationRecipes.push({
          colorA: config.colorB,
          colorB: config.colorA,
          variant: config.variant,
          tier,
          outputColor: config.colorA,
          outputTier: nextTier,
          name: `${PETAL_TIER_NAMES[tier]}·${config.name}(反) → ${PETAL_VARIANT_NAMES[config.variant]}${PETAL_TIER_NAMES[nextTier]}(${config.colorA})`
        });
        this.mutationRecipes.push({
          colorA: config.colorB,
          colorB: config.colorA,
          variant: config.variant,
          tier,
          outputColor: config.colorB,
          outputTier: nextTier,
          name: `${PETAL_TIER_NAMES[tier]}·${config.name}(反) → ${PETAL_VARIANT_NAMES[config.variant]}${PETAL_TIER_NAMES[nextTier]}(${config.colorB})`
        });
      });
    });
  }

  addToInventory(tier: PetalTier, color: PetalColor, variant?: PetalVariant): void {
    const existing = this.inventory.find(i => i.tier === tier && i.color === color && i.variant === variant);
    if (existing) {
      existing.count++;
    } else {
      this.inventory.push({ tier, color, variant, count: 1 });
    }
  }

  removeFromInventory(tier: PetalTier, color: PetalColor, count: number, variant?: PetalVariant): boolean {
    const item = this.inventory.find(i => i.tier === tier && i.color === color && i.variant === variant);
    if (!item || item.count < count) return false;

    item.count -= count;
    if (item.count <= 0) {
      const idx = this.inventory.indexOf(item);
      this.inventory.splice(idx, 1);
    }
    return true;
  }

  getItemCount(tier: PetalTier, color: PetalColor, variant?: PetalVariant): number {
    const item = this.inventory.find(i => i.tier === tier && i.color === color && i.variant === variant);
    return item?.count || 0;
  }

  getInventory(): InventoryItem[] {
    return [...this.inventory];
  }

  getRecipes(): SynthesisRecipe[] {
    return [...this.recipes];
  }

  trySynthesize(tier: PetalTier, color: PetalColor): SynthesisResult {
    const recipe = this.recipes.find(r =>
      r.input.length === 1 &&
      r.input[0].tier === tier &&
      r.input[0].color === color
    );

    if (!recipe) {
      return { success: false, message: '找不到合成配方' };
    }

    for (const input of recipe.input) {
      if (this.getItemCount(input.tier, input.color) < input.count) {
        return {
          success: false,
          message: `材料不足：需要 ${input.count} 个 ${PETAL_TIER_NAMES[input.tier as PetalTier]}(${input.color})`
        };
      }
    }

    for (const input of recipe.input) {
      this.removeFromInventory(input.tier, input.color, input.count);
    }

    this.addToInventory(recipe.output.tier, recipe.output.color);

    return {
      success: true,
      output: recipe.output,
      message: `合成成功！获得 ${PETAL_TIER_NAMES[recipe.output.tier as PetalTier]}(${recipe.output.color})`
    };
  }

  trySynthesizeMax(tier: PetalTier, color: PetalColor): {
    success: boolean;
    totalSynthesized: number;
    highestTier: PetalTier;
    outputs: { tier: PetalTier; color: PetalColor; count: number }[];
  } {
    let totalSynth = 0;
    const outputs: { tier: PetalTier; color: PetalColor; count: number }[] = [];
    let currentTier = tier;
    let highestTier = tier;

    while (currentTier < 5) {
      const count = this.getItemCount(currentTier as PetalTier, color);
      const needCount = color === 'rainbow' ? 2 : 3;

      if (count < needCount) break;

      const recipe = this.recipes.find(r =>
        r.input.length === 1 &&
        r.input[0].tier === currentTier &&
        r.input[0].color === color
      );

      if (!recipe) break;

      const times = Math.floor(count / needCount);
      for (let i = 0; i < times; i++) {
        const result = this.trySynthesize(currentTier as PetalTier, color);
        if (result.success && result.output) {
          totalSynth++;
          highestTier = Math.max(highestTier, result.output.tier) as PetalTier;
          const existing = outputs.find(o => o.tier === result.output!.tier && o.color === result.output!.color);
          if (existing) {
            existing.count += result.output.count;
          } else {
            outputs.push({ ...result.output });
          }
        }
      }

      currentTier = (currentTier + 1) as PetalTier;
    }

    return {
      success: totalSynth > 0,
      totalSynthesized: totalSynth,
      highestTier,
      outputs
    };
  }

  trySynthesizeRainbow(): SynthesisResult {
    const pinkCount = this.getItemCount(1, 'pink');
    const blueCount = this.getItemCount(1, 'blue');
    const purpleCount = this.getItemCount(1, 'purple');

    if (pinkCount < 1 || blueCount < 1 || purpleCount < 1) {
      return { success: false, message: '需要粉、蓝、紫各1个花瓣' };
    }

    this.removeFromInventory(1, 'pink', 1);
    this.removeFromInventory(1, 'blue', 1);
    this.removeFromInventory(1, 'purple', 1);
    this.addToInventory(2, 'rainbow');

    return {
      success: true,
      output: { tier: 2, color: 'rainbow', count: 1 },
      message: '合成彩虹花瓣成功！'
    };
  }

  trySynthesizeRainbowMax(): {
    success: boolean;
    count: number;
  } {
    let total = 0;
    while (true) {
      const result = this.trySynthesizeRainbow();
      if (!result.success) break;
      total++;
    }
    return { success: total > 0, count: total };
  }

  getColorHighestTier(color: PetalColor): PetalTier | null {
    let highest: PetalTier | null = null;
    for (let tier: PetalTier = 5; tier >= 1; tier = (tier - 1) as PetalTier) {
      if (this.getItemCount(tier, color) > 0) {
        highest = tier;
        break;
      }
    }
    return highest;
  }

  getColorTotalCount(color: PetalColor): number {
    let total = 0;
    for (let tier: PetalTier = 1; tier <= 5; tier = (tier + 1) as PetalTier) {
      total += this.getItemCount(tier, color);
    }
    return total;
  }

  canSynthesize(color: PetalColor): boolean {
    if (color === 'rainbow') {
      for (let tier: PetalTier = 2; tier <= 4; tier = (tier + 1) as PetalTier) {
        if (this.getItemCount(tier, color) >= 2) return true;
      }
      return false;
    }
    for (let tier: PetalTier = 1; tier <= 4; tier = (tier + 1) as PetalTier) {
      if (this.getItemCount(tier, color) >= 3) return true;
    }
    return false;
  }

  canMakeRainbow(): boolean {
    return this.getItemCount(1, 'pink') >= 1 &&
           this.getItemCount(1, 'blue') >= 1 &&
           this.getItemCount(1, 'purple') >= 1;
  }

  getTotalPetalCount(): number {
    return this.inventory.reduce((sum, item) => sum + item.count, 0);
  }

  clear(): void {
    this.inventory = [];
  }

  toPetalDataArray(): Omit<Petal, 'id' | 'x' | 'y' | 'collected'>[] {
    return this.inventory.map(i => ({
      tier: i.tier,
      color: i.color
    }));
  }

  validateInventory(): InventoryValidationResult {
    const issues: string[] = [];
    const corrected: InventoryItem[] = [];
    const validTiers: PetalTier[] = [1, 2, 3, 4, 5];
    const validColors: PetalColor[] = ['pink', 'blue', 'purple', 'gold', 'rainbow'];
    const validVariants: PetalVariant[] = ['flame', 'frost', 'shadow', 'nature'];

    const seen = new Map<string, InventoryItem>();

    for (const item of this.inventory) {
      if (!validTiers.includes(item.tier)) {
        issues.push(`无效的花瓣等级: ${item.tier}`);
        continue;
      }

      if (!validColors.includes(item.color)) {
        issues.push(`无效的花瓣颜色: ${item.color}`);
        continue;
      }

      if (item.variant && !validVariants.includes(item.variant)) {
        issues.push(`无效的异变类型: ${item.variant}`);
        continue;
      }

      if (typeof item.count !== 'number' || isNaN(item.count)) {
        issues.push(`无效的数量值: ${item.count}`);
        continue;
      }

      if (item.count <= 0) {
        issues.push(`移除数量为 ${item.count} 的物品: ${PETAL_TIER_NAMES[item.tier]}(${item.color})${item.variant ? `·${PETAL_VARIANT_NAMES[item.variant]}` : ''}`);
        continue;
      }

      const key = `${item.tier}-${item.color}-${item.variant ?? ''}`;
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        existing.count += item.count;
        issues.push(`合并重复物品: ${PETAL_TIER_NAMES[item.tier]}(${item.color})${item.variant ? `·${PETAL_VARIANT_NAMES[item.variant]}` : ''} x${item.count}`);
      } else {
        seen.set(key, { ...item });
      }
    }

    corrected.push(...seen.values());

    corrected.sort((a, b) => {
      const va = a.variant ?? '';
      const vb = b.variant ?? '';
      if (va !== vb) return va.localeCompare(vb);
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.tier - b.tier;
    });

    const hadIssues = issues.length > 0;
    if (hadIssues) {
      this.inventory = corrected;
      issues.unshift(`背包校验完成，发现 ${issues.length} 个问题`);
    }

    return {
      valid: !hadIssues,
      issues,
      correctedInventory: corrected
    };
  }

  setAutoFeedEnabled(enabled: boolean): void {
    this.autoFeedEnabled = enabled;
  }

  isAutoFeedEnabled(): boolean {
    return this.autoFeedEnabled;
  }

  addPendingPetal(petal: PetalType): void {
    if (!petal.collected) {
      this.pendingPetals.push(petal);
    }
  }

  getPendingPetals(): PetalType[] {
    return [...this.pendingPetals];
  }

  clearPendingPetals(): void {
    this.pendingPetals = [];
  }

  tryAutoFeed(targetTier: PetalTier, targetColor: PetalColor): AutoFeedResult {
    if (!this.autoFeedEnabled) {
      return { success: false, fedCount: 0, items: [] };
    }

    const needCount = targetColor === 'rainbow' ? 2 : 3;
    const currentCount = this.getItemCount(targetTier, targetColor);
    const deficit = needCount - currentCount;

    if (deficit <= 0) {
      return { success: false, fedCount: 0, items: [] };
    }

    const snapshot = this.inventory.map(item => ({ ...item }));

    const fedItems: { tier: PetalTier; color: PetalColor; count: number }[] = [];
    let targetAdded = 0;

    const lowerTiers: PetalTier[] = [];
    for (let t: PetalTier = 1; t < targetTier; t = (t + 1) as PetalTier) {
      lowerTiers.unshift(t as PetalTier);
    }

    for (const tier of lowerTiers) {
      if (targetAdded >= deficit) break;

      const available = this.getItemCount(tier, targetColor);
      if (available >= needCount) {
        const batches = Math.min(
          Math.floor(available / needCount),
          deficit - targetAdded
        );

        if (batches > 0) {
          const consumed = batches * needCount;
          this.removeFromInventory(tier, targetColor, consumed);

          for (let b = 0; b < batches; b++) {
            this.addToInventory(targetTier, targetColor);
          }

          fedItems.push({ tier, color: targetColor, count: consumed });
          targetAdded += batches;
        }
      }
    }

    if (targetAdded >= deficit) {
      const totalLowLevelConsumed = fedItems.reduce((sum, item) => sum + item.count, 0);
      return { success: true, fedCount: totalLowLevelConsumed, items: fedItems };
    }

    this.inventory = snapshot;

    return { success: false, fedCount: 0, items: [] };
  }

  addToSynthesisQueue(tier: PetalTier, color: PetalColor): void {
    this.synthesisQueue.push({
      tier,
      color,
      timestamp: Date.now()
    });
  }

  getSynthesisQueue(): SynthesisQueueItem[] {
    return [...this.synthesisQueue];
  }

  clearSynthesisQueue(): void {
    this.synthesisQueue = [];
  }

  processSynthesisQueue(): SynthesisResult[] {
    const results: SynthesisResult[] = [];
    const queueCopy = [...this.synthesisQueue];
    this.synthesisQueue = [];

    for (const item of queueCopy) {
      const result = this.trySynthesize(item.tier, item.color);
      results.push(result);
    }

    return results;
  }

  tryContinuousSynthesize(
    tier: PetalTier,
    color: PetalColor,
    maxChain: number = 10,
    useAutoFeed: boolean = true
  ): ContinuousSynthesisResult {
    const validation = this.validateInventory();
    if (!validation.valid) {
      console.warn('[SynthesisSystem] 背包校验发现问题:', validation.issues);
    }

    let totalSynth = 0;
    const outputs: { tier: PetalTier; color: PetalColor; count: number }[] = [];
    let currentTier = tier;
    let highestTier = tier;
    let chainLength = 0;
    let autoFedCount = 0;

    while (currentTier < 5 && chainLength < maxChain) {
      const needCount = color === 'rainbow' ? 2 : 3;
      let count = this.getItemCount(currentTier as PetalTier, color);

      if (count < needCount && useAutoFeed && this.autoFeedEnabled) {
        const autoFeedResult = this.tryAutoFeed(currentTier as PetalTier, color);
        if (autoFeedResult.success) {
          autoFedCount += autoFeedResult.fedCount;
          count = this.getItemCount(currentTier as PetalTier, color);
        }
      }

      if (count < needCount) break;

      const recipe = this.recipes.find(r =>
        r.input.length === 1 &&
        r.input[0].tier === currentTier &&
        r.input[0].color === color
      );

      if (!recipe) break;

      const times = Math.floor(count / needCount);
      let synthesizedThisTier = 0;

      for (let i = 0; i < times && chainLength < maxChain; i++) {
        const result = this.trySynthesize(currentTier as PetalTier, color);
        if (result.success && result.output) {
          totalSynth++;
          chainLength++;
          synthesizedThisTier++;
          highestTier = Math.max(highestTier, result.output.tier) as PetalTier;

          const existing = outputs.find(o => o.tier === result.output!.tier && o.color === result.output!.color);
          if (existing) {
            existing.count += result.output.count;
          } else {
            outputs.push({ ...result.output });
          }
        } else {
          break;
        }
      }

      if (synthesizedThisTier === 0) break;

      currentTier = (currentTier + 1) as PetalTier;
    }

    return {
      success: totalSynth > 0,
      totalSynthesized: totalSynth,
      highestTier,
      outputs,
      chainLength,
      autoFedCount
    };
  }

  tryRainbowContinuousSynthesize(
    maxChain: number = 10
  ): {
    success: boolean;
    totalSynthesized: number;
    highestTier: PetalTier;
    outputs: { tier: PetalTier; color: PetalColor; count: number }[];
    chainLength: number;
    rainbowCount: number;
  } {
    const validation = this.validateInventory();
    if (!validation.valid) {
      console.warn('[SynthesisSystem] 背包校验发现问题:', validation.issues);
    }

    let rainbowCount = 0;
    while (this.canMakeRainbow() && rainbowCount < maxChain) {
      const result = this.trySynthesizeRainbow();
      if (result.success) {
        rainbowCount++;
      } else {
        break;
      }
    }

    if (rainbowCount === 0) {
      return {
        success: false,
        totalSynthesized: 0,
        highestTier: 1,
        outputs: [],
        chainLength: 0,
        rainbowCount: 0
      };
    }

    const continuousResult = this.tryContinuousSynthesize(2, 'rainbow', maxChain - rainbowCount, true);

    const finalOutputs = [...continuousResult.outputs];
    if (rainbowCount > 0) {
      const existing = finalOutputs.find(o => o.tier === 2 && o.color === 'rainbow');
      if (existing) {
        existing.count += rainbowCount;
      } else {
        finalOutputs.push({ tier: 2, color: 'rainbow', count: rainbowCount });
      }
    }

    return {
      success: true,
      totalSynthesized: rainbowCount + continuousResult.totalSynthesized,
      highestTier: Math.max(2, continuousResult.highestTier) as PetalTier,
      outputs: finalOutputs,
      chainLength: rainbowCount + continuousResult.chainLength,
      rainbowCount
    };
  }

  canAutoFeedFor(tier: PetalTier, color: PetalColor): boolean {
    if (!this.autoFeedEnabled) return false;

    const needCount = color === 'rainbow' ? 2 : 3;
    const currentCount = this.getItemCount(tier, color);

    if (currentCount >= needCount) return false;

    const deficit = needCount - currentCount;

    const lowerTiers: PetalTier[] = [];
    for (let t: PetalTier = 1; t < tier; t = (t + 1) as PetalTier) {
      lowerTiers.unshift(t as PetalTier);
    }

    let availableBatches = 0;
    for (const t of lowerTiers) {
      const count = this.getItemCount(t, color);
      availableBatches += Math.floor(count / needCount);
    }

    return availableBatches >= deficit;
  }

  setInventory(inventory: InventoryItem[]): void {
    this.inventory = inventory.map(item => ({ ...item }));
    this.validateInventory();
  }

  getInventoryCopy(): InventoryItem[] {
    return this.inventory.map(item => ({ ...item }));
  }

  getMutationRecipes(): MutationRecipe[] {
    return [...this.mutationRecipes];
  }

  getAvailableMutations(): MutationRecipe[] {
    return this.mutationRecipes.filter(recipe => {
      const countA = this.getItemCount(recipe.tier, recipe.colorA);
      const countB = this.getItemCount(recipe.tier, recipe.colorB);
      return countA >= 1 && countB >= 1;
    });
  }

  canMutate(): boolean {
    return this.getAvailableMutations().length > 0;
  }

  tryMutate(tier: PetalTier, primaryColor: PetalColor, secondaryColor: PetalColor): MutationResult {
    const recipe = this.mutationRecipes.find(r =>
      r.tier === tier &&
      r.outputColor === primaryColor &&
      ((r.colorA === primaryColor && r.colorB === secondaryColor) ||
       (r.colorA === secondaryColor && r.colorB === primaryColor))
    );

    if (!recipe) {
      return { success: false, message: '找不到异变配方' };
    }

    if (this.getItemCount(tier, primaryColor) < 1) {
      return { success: false, message: `材料不足：需要 ${PETAL_TIER_NAMES[tier]}(${primaryColor})` };
    }

    if (this.getItemCount(tier, secondaryColor) < 1) {
      return { success: false, message: `材料不足：需要 ${PETAL_TIER_NAMES[tier]}(${secondaryColor})` };
    }

    this.removeFromInventory(tier, primaryColor, 1);
    this.removeFromInventory(tier, secondaryColor, 1);

    this.addToInventory(recipe.outputTier, recipe.outputColor, recipe.variant);
    this.mutationCount++;

    return {
      success: true,
      output: { tier: recipe.outputTier, color: recipe.outputColor, variant: recipe.variant, count: 1 },
      message: `异变成功！获得 ${PETAL_VARIANT_NAMES[recipe.variant]}${PETAL_TIER_NAMES[recipe.outputTier]}`
    };
  }

  tryMutateAll(): MutationResult[] {
    const results: MutationResult[] = [];
    let mutated = true;

    const tiers: PetalTier[] = [4, 3, 2, 1];

    while (mutated) {
      mutated = false;

      for (const tier of tiers) {
        if (mutated) break;

        for (const config of MUTATION_RECIPES_CONFIG) {
          if (mutated) break;

          const countA = this.getItemCount(tier, config.colorA);
          const countB = this.getItemCount(tier, config.colorB);

          if (countA < 1 || countB < 1) continue;

          const primaryColor = countA >= countB ? config.colorA : config.colorB;
          const secondaryColor = countA >= countB ? config.colorB : config.colorA;

          const result = this.tryMutate(tier, primaryColor, secondaryColor);
          results.push(result);
          if (result.success) {
            mutated = true;
          }
        }
      }
    }

    return results;
  }

  getMutationCount(): number {
    return this.mutationCount;
  }

  getVariantItemCount(variant: PetalVariant): number {
    return this.inventory
      .filter(i => i.variant === variant)
      .reduce((sum, i) => sum + i.count, 0);
  }

  getVariantHighestTier(variant: PetalVariant): PetalTier | null {
    let highest: PetalTier | null = null;
    for (let tier: PetalTier = 5; tier >= 1; tier = (tier - 1) as PetalTier) {
      if (this.inventory.some(i => i.tier === tier && i.variant === variant && i.count > 0)) {
        highest = tier;
        break;
      }
    }
    return highest;
  }

  getVariantItems(): InventoryItem[] {
    return this.inventory.filter(i => i.variant !== undefined);
  }

  recordOutput(tier: PetalTier, color: PetalColor, count: number, variant?: PetalVariant): void {
    const scoreGain = tier * 100 * count;
    const progressGain = tier * 4 * count;
    this.recentOutputs.unshift({
      tier,
      color,
      variant,
      count,
      timestamp: Date.now(),
      scoreGain,
      progressGain
    });
    if (this.recentOutputs.length > this.MAX_RECENT_OUTPUTS) {
      this.recentOutputs = this.recentOutputs.slice(0, this.MAX_RECENT_OUTPUTS);
    }
  }

  getRecentOutputs(): RecentOutput[] {
    return [...this.recentOutputs];
  }

  calculateMaterialShortages(goal?: TargetGoal | null): MaterialShortage[] {
    const shortages: MaterialShortage[] = [];
    const colors: PetalColor[] = ['pink', 'blue', 'purple', 'gold', 'rainbow'];

    if (goal) {
      if (goal.type === 'tier' && goal.targetTier) {
        const targetTier = goal.targetTier;
        const targetColor = goal.targetColor;
        colors.forEach(color => {
          if (targetColor && targetColor !== color && color !== 'rainbow') return;
          const needCount = color === 'rainbow' ? 2 : 3;
          const startTier: PetalTier = color === 'rainbow' ? 2 : 1;
          for (let tier: PetalTier = startTier; tier < targetTier; tier = (tier + 1) as PetalTier) {
            const current = this.getItemCount(tier, color);
            if (current < needCount) {
              shortages.push({
                tier,
                color,
                required: needCount,
                current,
                deficit: needCount - current,
                critical: tier === (targetTier - 1) as PetalTier
              });
            }
          }
        });
      } else if (goal.type === 'rainbow') {
        const rainbowNeed = 1;
        const pinkNeed = 1, blueNeed = 1, purpleNeed = 1;
        (['pink', 'blue', 'purple'] as PetalColor[]).forEach(color => {
          const current = this.getItemCount(1, color);
          const need = color === 'pink' ? pinkNeed : color === 'blue' ? blueNeed : purpleNeed;
          if (current < need) {
            shortages.push({
              tier: 1,
              color,
              required: need,
              current,
              deficit: need - current,
              critical: true
            });
          }
        });
        for (let tier: PetalTier = 2; tier <= 4; tier = (tier + 1) as PetalTier) {
          const current = this.getItemCount(tier, 'rainbow');
          if (current < 2) {
            shortages.push({
              tier,
              color: 'rainbow',
              required: 2,
              current,
              deficit: 2 - current,
              critical: tier === 4
            });
          }
        }
      } else if (goal.type === 'variant' && goal.targetVariant) {
        const config = MUTATION_RECIPES_CONFIG.find(c => c.variant === goal.targetVariant);
        if (config) {
          const targetTier = goal.targetTier ?? 1;
          for (let tier: PetalTier = targetTier; tier <= 4; tier = (tier + 1) as PetalTier) {
            const countA = this.getItemCount(tier, config.colorA);
            const countB = this.getItemCount(tier, config.colorB);
            if (countA < 1) {
              shortages.push({
                tier,
                color: config.colorA,
                required: 1,
                current: countA,
                deficit: 1 - countA,
                critical: tier === targetTier
              });
            }
            if (countB < 1) {
              shortages.push({
                tier,
                color: config.colorB,
                required: 1,
                current: countB,
                deficit: 1 - countB,
                critical: tier === targetTier
              });
            }
          }
        }
      }
    } else {
      colors.forEach(color => {
        const needCount = color === 'rainbow' ? 2 : 3;
        const startTier: PetalTier = color === 'rainbow' ? 2 : 1;
        for (let tier: PetalTier = startTier; tier <= 4; tier = (tier + 1) as PetalTier) {
          const current = this.getItemCount(tier, color);
          if (current < needCount && current > 0) {
            shortages.push({
              tier,
              color,
              required: needCount,
              current,
              deficit: needCount - current,
              critical: current === needCount - 1
            });
          }
        }
      });
    }

    shortages.sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return b.deficit - a.deficit;
    });

    return shortages;
  }

  generateAvailableGoals(): TargetGoal[] {
    const goals: TargetGoal[] = [];
    const colors: PetalColor[] = ['pink', 'blue', 'purple', 'gold'];

    colors.forEach(color => {
      const highestTier = this.getColorHighestTier(color) ?? 1;
      if (highestTier < 5) {
        const nextTier = (highestTier + 1) as PetalTier;
        const totalCount = this.getColorTotalCount(color);
        const needCount = 3;
        const currentAtTier = this.getItemCount(highestTier, color);
        goals.push({
          id: `tier_${color}_${nextTier}`,
          type: 'tier',
          name: `合成${PETAL_TIER_NAMES[nextTier]}(${color})`,
          description: `收集 ${needCount} 个${PETAL_TIER_NAMES[highestTier]}(${color})进行合成`,
          targetTier: nextTier,
          targetColor: color,
          targetCount: needCount,
          currentCount: currentAtTier,
          priority: nextTier * 10 + (color === 'gold' ? 5 : 0),
          completed: currentAtTier >= needCount
        });
      }
    });

    const rainbowHighest = this.getColorHighestTier('rainbow') ?? 1;
    if (rainbowHighest < 5) {
      const pink = this.getItemCount(1, 'pink');
      const blue = this.getItemCount(1, 'blue');
      const purple = this.getItemCount(1, 'purple');
      const minCount = Math.min(pink, blue, purple);
      const nextRainbowTier = rainbowHighest < 2 ? 2 as PetalTier : (rainbowHighest + 1) as PetalTier;
      goals.push({
        id: `rainbow_${nextRainbowTier}`,
        type: 'rainbow',
        name: `合成${PETAL_TIER_NAMES[nextRainbowTier]}(彩虹)`,
        description: '粉蓝紫各1个合成彩虹，再逐级升级',
        targetTier: nextRainbowTier,
        targetColor: 'rainbow',
        targetCount: 1,
        currentCount: minCount,
        priority: 50,
        completed: minCount >= 1 && rainbowHighest >= nextRainbowTier
      });
    }

    const variants: PetalVariant[] = ['flame', 'frost', 'shadow', 'nature'];
    variants.forEach(variant => {
      const config = MUTATION_RECIPES_CONFIG.find(c => c.variant === variant);
      if (!config) return;
      const highestA = this.getColorHighestTier(config.colorA) ?? 1;
      const highestB = this.getColorHighestTier(config.colorB) ?? 1;
      const targetTier = Math.min(highestA, highestB) as PetalTier;
      const countA = this.getItemCount(targetTier, config.colorA);
      const countB = this.getItemCount(targetTier, config.colorB);
      const variantHighest = this.getVariantHighestTier(variant) ?? 0;
      if (targetTier > variantHighest && targetTier < 5) {
        goals.push({
          id: `variant_${variant}_${targetTier}`,
          type: 'variant',
          name: `异变${PETAL_TIER_NAMES[(targetTier + 1) as PetalTier]}·${PETAL_VARIANT_NAMES[variant]}`,
          description: `使用 ${PETAL_TIER_NAMES[targetTier]}(${config.colorA}) + ${PETAL_TIER_NAMES[targetTier]}(${config.colorB}) 进行异变`,
          targetTier: (targetTier + 1) as PetalTier,
          targetVariant: variant,
          targetCount: 1,
          currentCount: Math.min(countA, countB),
          priority: 35 + targetTier * 5,
          completed: countA >= 1 && countB >= 1
        });
      }
    });

    goals.sort((a, b) => b.priority - a.priority);
    this.availableGoals = goals;

    if (!this.activeGoal) {
      this.activeGoal = goals.find(g => !g.completed) || goals[0] || null;
    } else {
      const updated = goals.find(g => g.id === this.activeGoal!.id);
      if (updated) {
        this.activeGoal = updated;
      }
    }

    return goals;
  }

  getActiveGoal(): TargetGoal | null {
    return this.activeGoal;
  }

  setActiveGoal(goalId: string): boolean {
    const goal = this.availableGoals.find(g => g.id === goalId);
    if (goal) {
      this.activeGoal = goal;
      return true;
    }
    return false;
  }

  generateRecommendedRoutes(): RecommendedRoute[] {
    const routes: RecommendedRoute[] = [];
    const colors: PetalColor[] = ['pink', 'blue', 'purple', 'gold'];

    const fastSteps: RouteStep[] = [];
    let fastScore = 0;
    colors.forEach(color => {
      const count = this.getItemCount(1, color);
      if (count >= 3) {
        const batches = Math.floor(count / 3);
        fastSteps.push({
          description: `采集${PETAL_TIER_NAMES[2]}(${color}) ×${batches}`,
          action: 'synthesize',
          color,
          tier: 1,
          targetCount: batches,
          estimatedScore: batches * 2 * 100
        });
        fastScore += batches * 200;
      }
    });
    if (fastSteps.length > 0) {
      routes.push({
        id: 'route_fast',
        name: '快速合成',
        steps: fastSteps,
        totalEstimatedScore: fastScore,
        totalEstimatedProgress: Math.floor(fastScore / 25),
        feasibility: 0.9,
        tag: 'fast'
      });
    }

    const pink = this.getItemCount(1, 'pink');
    const blue = this.getItemCount(1, 'blue');
    const purple = this.getItemCount(1, 'purple');
    if (pink >= 1 && blue >= 1 && purple >= 1) {
      const rainbowBatches = Math.min(pink, blue, purple);
      const rainbowSteps: RouteStep[] = [{
        description: `粉蓝紫合成彩虹 ×${rainbowBatches}`,
        action: 'rainbow',
        targetCount: rainbowBatches,
        estimatedScore: rainbowBatches * 200
      }];
      const rainbow2 = this.getItemCount(2, 'rainbow') + rainbowBatches;
      if (rainbow2 >= 2) {
        rainbowSteps.push({
          description: `彩虹升级到${PETAL_TIER_NAMES[3]} ×${Math.floor(rainbow2 / 2)}`,
          action: 'synthesize',
          color: 'rainbow',
          tier: 2,
          targetCount: Math.floor(rainbow2 / 2),
          estimatedScore: Math.floor(rainbow2 / 2) * 300
        });
      }
      routes.push({
        id: 'route_rainbow',
        name: '彩虹进阶',
        steps: rainbowSteps,
        totalEstimatedScore: rainbowBatches * 200 + (rainbow2 >= 2 ? Math.floor(rainbow2 / 2) * 300 : 0),
        totalEstimatedProgress: rainbowBatches * 8 + (rainbow2 >= 2 ? Math.floor(rainbow2 / 2) * 12 : 0),
        feasibility: 0.75,
        tag: 'rare'
      });
    }

    const variantSteps: RouteStep[] = [];
    let variantScore = 0;
    MUTATION_RECIPES_CONFIG.forEach(config => {
      const highestA = this.getColorHighestTier(config.colorA) ?? 1;
      const highestB = this.getColorHighestTier(config.colorB) ?? 1;
      const tier = Math.min(highestA, highestB) as PetalTier;
      const countA = this.getItemCount(tier, config.colorA);
      const countB = this.getItemCount(tier, config.colorB);
      if (countA >= 1 && countB >= 1 && tier < 5) {
        const batches = Math.min(countA, countB);
        variantSteps.push({
          description: `异变${PETAL_VARIANT_NAMES[config.variant]} · ×${batches}`,
          action: 'mutate',
          targetCount: batches,
          estimatedScore: batches * (tier + 1) * 150
        });
        variantScore += batches * (tier + 1) * 150;
      }
    });
    if (variantSteps.length > 0) {
      routes.push({
        id: 'route_variant',
        name: '异变合成',
        steps: variantSteps,
        totalEstimatedScore: variantScore,
        totalEstimatedProgress: Math.floor(variantScore / 30),
        feasibility: 0.7,
        tag: 'efficient'
      });
    }

    const balancedSteps: RouteStep[] = [];
    let balancedScore = 0;
    const shortages = this.calculateMaterialShortages(this.activeGoal);
    if (shortages.length > 0) {
      shortages.slice(0, 3).forEach(s => {
        balancedSteps.push({
          description: `收集${PETAL_TIER_NAMES[s.tier]}(${s.color}) 还需${s.deficit}个`,
          action: 'collect',
          color: s.color,
          tier: s.tier,
          targetCount: s.deficit,
          estimatedScore: s.deficit * s.tier * 15
        });
        balancedScore += s.deficit * s.tier * 15;
      });
    } else {
      const activeGoal = this.activeGoal;
      if (activeGoal && activeGoal.targetColor) {
        balancedSteps.push({
          description: activeGoal.name,
          action: activeGoal.type === 'variant' ? 'mutate' : activeGoal.type === 'rainbow' ? 'rainbow' : 'synthesize',
          color: activeGoal.targetColor,
          tier: activeGoal.targetTier,
          targetCount: 1,
          estimatedScore: (activeGoal.targetTier ?? 1) * 100
        });
        balancedScore += (activeGoal.targetTier ?? 1) * 100;
      }
    }
    if (balancedSteps.length > 0) {
      routes.push({
        id: 'route_balanced',
        name: '目标追踪',
        steps: balancedSteps,
        totalEstimatedScore: balancedScore,
        totalEstimatedProgress: Math.floor(balancedScore / 25),
        feasibility: 0.95,
        tag: 'balanced'
      });
    }

    routes.sort((a, b) => b.feasibility * b.totalEstimatedScore - a.feasibility * a.totalEstimatedScore);
    return routes;
  }

  calculateTotalSynthesisPossible(): number {
    let total = 0;
    const colors: PetalColor[] = ['pink', 'blue', 'purple', 'gold'];
    colors.forEach(color => {
      for (let tier: PetalTier = 1; tier <= 4; tier = (tier + 1) as PetalTier) {
        total += Math.floor(this.getItemCount(tier, color) / 3);
      }
    });
    for (let tier: PetalTier = 2; tier <= 4; tier = (tier + 1) as PetalTier) {
      total += Math.floor(this.getItemCount(tier, 'rainbow') / 2);
    }
    total += Math.min(
      this.getItemCount(1, 'pink'),
      this.getItemCount(1, 'blue'),
      this.getItemCount(1, 'purple')
    );
    total += this.getAvailableMutations().length;
    return total;
  }

  getTargetTrackingData(): TargetTrackingData {
    this.generateAvailableGoals();
    return {
      activeGoal: this.activeGoal,
      availableGoals: this.availableGoals,
      materialShortages: this.calculateMaterialShortages(this.activeGoal),
      recentOutputs: this.recentOutputs,
      recommendedRoutes: this.generateRecommendedRoutes(),
      totalSynthesisPossible: this.calculateTotalSynthesisPossible()
    };
  }

  clearRecentOutputs(): void {
    this.recentOutputs = [];
  }
}
