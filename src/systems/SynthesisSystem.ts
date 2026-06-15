import { InventoryItem, PetalTier, PetalColor, PETAL_TIER_NAMES, SynthesisRecipe, Petal } from '../types';

export interface SynthesisResult {
  success: boolean;
  output?: { tier: PetalTier; color: PetalColor; count: number };
  message?: string;
}

export class SynthesisSystem {
  private inventory: InventoryItem[] = [];
  private recipes: SynthesisRecipe[] = [];

  constructor() {
    this.initializeRecipes();
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

  addToInventory(tier: PetalTier, color: PetalColor): void {
    const existing = this.inventory.find(i => i.tier === tier && i.color === color);
    if (existing) {
      existing.count++;
    } else {
      this.inventory.push({ tier, color, count: 1 });
    }
  }

  removeFromInventory(tier: PetalTier, color: PetalColor, count: number): boolean {
    const item = this.inventory.find(i => i.tier === tier && i.color === color);
    if (!item || item.count < count) return false;

    item.count -= count;
    if (item.count <= 0) {
      const idx = this.inventory.indexOf(item);
      this.inventory.splice(idx, 1);
    }
    return true;
  }

  getItemCount(tier: PetalTier, color: PetalColor): number {
    const item = this.inventory.find(i => i.tier === tier && i.color === color);
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
}
