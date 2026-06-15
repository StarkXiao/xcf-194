import Phaser from 'phaser';

export class AssetGenerator {
  static generatedTextures: Map<string, HTMLCanvasElement> = new Map();

  static generateAll(): void {
    this.generateLoverSleeping();
    this.generateLoverAwake();
  }

  static registerTextures(scene: Phaser.Scene): void {
    this.generatedTextures.forEach((canvas, key) => {
      if (scene.textures.exists(key)) return;
      scene.textures.addCanvas(key, canvas);
    });
  }

  private static createCanvas(key: string, width: number, height: number): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    this.generatedTextures.set(key, canvas);
    return { canvas, ctx };
  }

  private static generateLoverSleeping(): void {
    const w = 300;
    const h = 380;
    const { canvas, ctx } = this.createCanvas('lover_sleeping', w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    const gradient = ctx.createRadialGradient(0, 0, 20, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(240, 171, 252, 0.3)');
    gradient.addColorStop(1, 'rgba(240, 171, 252, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, 50);
    const bodyGradient = ctx.createLinearGradient(0, -50, 0, 100);
    bodyGradient.addColorStop(0, '#f3e8ff');
    bodyGradient.addColorStop(1, '#c4b5fd');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 30, 110, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    const dressRuffle = ctx.createLinearGradient(0, 50, 0, 100);
    dressRuffle.addColorStop(0, '#e9d5ff');
    dressRuffle.addColorStop(1, '#a78bfa');
    ctx.fillStyle = dressRuffle;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * 28, 75, 20, 0, Math.PI, false);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(0, -40);
    const hairGradient = ctx.createLinearGradient(0, -80, 0, 20);
    hairGradient.addColorStop(0, '#5b21b6');
    hairGradient.addColorStop(0.5, '#7c3aed');
    hairGradient.addColorStop(1, '#4c1d95');
    ctx.fillStyle = hairGradient;
    ctx.beginPath();
    ctx.ellipse(0, -30, 65, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-55, -20);
    ctx.quadraticCurveTo(-80, 30, -60, 50);
    ctx.quadraticCurveTo(-40, 20, -40, -10);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(55, -20);
    ctx.quadraticCurveTo(80, 30, 60, 50);
    ctx.quadraticCurveTo(40, 20, 40, -10);
    ctx.closePath();
    ctx.fill();

    const faceGradient = ctx.createRadialGradient(-10, -30, 5, 0, -30, 45);
    faceGradient.addColorStop(0, '#fff7ed');
    faceGradient.addColorStop(1, '#fef3c7');
    ctx.fillStyle = faceGradient;
    ctx.beginPath();
    ctx.arc(0, -30, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5b21b6';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, -32);
    ctx.quadraticCurveTo(-18, -28, -14, -32);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, -32);
    ctx.quadraticCurveTo(18, -28, 22, -32);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-20, -32);
    ctx.lineTo(-22, -42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, -32);
    ctx.lineTo(-16, -42);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, -32);
    ctx.lineTo(16, -42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, -32);
    ctx.lineTo(22, -42);
    ctx.stroke();

    ctx.fillStyle = 'rgba(251, 113, 133, 0.4)';
    ctx.beginPath();
    ctx.arc(-26, -18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(26, -18, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -15, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#fcd34d';
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const sx = Math.cos(angle) * 35;
      const sy = -90 + Math.sin(angle) * 18;
      this.drawStar(ctx, sx, sy, 4, 2, 5);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(0, -60);
    ctx.fillStyle = '#f472b6';
    this.drawFlower(ctx, -20, -40, 8);
    ctx.fillStyle = '#fb923c';
    this.drawFlower(ctx, 15, -30, 6);
    ctx.fillStyle = '#c084fc';
    this.drawFlower(ctx, 30, -55, 7);
    ctx.restore();

    ctx.restore();
  }

  private static generateLoverAwake(): void {
    const w = 300;
    const h = 400;
    const { canvas, ctx } = this.createCanvas('lover_awake', w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    const gradient = ctx.createRadialGradient(0, 0, 30, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
    gradient.addColorStop(0.5, 'rgba(240, 171, 252, 0.3)');
    gradient.addColorStop(1, 'rgba(240, 171, 252, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 200, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, 40);
    const bodyGradient = ctx.createLinearGradient(0, -60, 0, 120);
    bodyGradient.addColorStop(0, '#fef3c7');
    bodyGradient.addColorStop(0.5, '#fce7f3');
    bodyGradient.addColorStop(1, '#c4b5fd');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 20, 100, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(0, -60);

    const hairGradient = ctx.createLinearGradient(0, -100, 0, 30);
    hairGradient.addColorStop(0, '#7c3aed');
    hairGradient.addColorStop(0.5, '#a78bfa');
    hairGradient.addColorStop(1, '#5b21b6');
    ctx.fillStyle = hairGradient;
    ctx.beginPath();
    ctx.ellipse(0, -40, 70, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    const sideHairGradient = ctx.createLinearGradient(-60, -20, 0, 80);
    sideHairGradient.addColorStop(0, '#7c3aed');
    sideHairGradient.addColorStop(1, '#a78bfa');
    ctx.fillStyle = sideHairGradient;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 50, 0);
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.quadraticCurveTo(side * 40, 40, side * 20, 100);
      ctx.quadraticCurveTo(side * 10, 60, -side * 10, -20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const faceGradient = ctx.createRadialGradient(-10, -40, 5, 0, -40, 50);
    faceGradient.addColorStop(0, '#ffffff');
    faceGradient.addColorStop(1, '#fef3c7');
    ctx.fillStyle = faceGradient;
    ctx.beginPath();
    ctx.arc(0, -40, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-20, -45, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, -45, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const eyeGradient = ctx.createRadialGradient(-20, -44, 2, -20, -44, 10);
    eyeGradient.addColorStop(0, '#f0abfc');
    eyeGradient.addColorStop(0.7, '#a78bfa');
    eyeGradient.addColorStop(1, '#4c1d95');
    ctx.fillStyle = eyeGradient;
    ctx.beginPath();
    ctx.arc(-20, -44, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, -44, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-17, -47, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(23, -47, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-30, -58);
    ctx.quadraticCurveTo(-20, -63, -10, -58);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -58);
    ctx.quadraticCurveTo(20, -63, 30, -58);
    ctx.stroke();

    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 2;
    for (const ex of [-20, 20]) {
      ctx.beginPath();
      ctx.moveTo(ex - 6, -52);
      ctx.quadraticCurveTo(ex - 10, -56, ex - 12, -54);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex - 3, -54);
      ctx.quadraticCurveTo(ex - 6, -58, ex - 8, -56);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex + 4, -54);
      ctx.quadraticCurveTo(ex + 1, -58, ex - 1, -56);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(251, 113, 133, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-30, -30, 9, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(30, -30, 9, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.quadraticCurveTo(0, -10, 10, -20);
    ctx.stroke();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(0, -20, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fde68a';
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const sx = Math.cos(angle) * 75;
      const sy = -100 + Math.sin(angle) * 40;
      this.drawStar(ctx, sx, sy, 5, 2, 5);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(0, -80);
    ctx.fillStyle = '#f472b6';
    this.drawFlower(ctx, -30, -50, 9);
    ctx.fillStyle = '#fb923c';
    this.drawFlower(ctx, -10, -65, 7);
    ctx.fillStyle = '#c084fc';
    this.drawFlower(ctx, 20, -45, 8);
    ctx.fillStyle = '#fef08a';
    this.drawFlower(ctx, 40, -60, 6);
    ctx.restore();

    ctx.restore();
  }

  private static drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private static drawFlower(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number
  ): void {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * size * 0.8;
      const py = cy + Math.sin(angle) * size * 0.8;
      ctx.beginPath();
      ctx.arc(px, py, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
