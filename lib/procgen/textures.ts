import * as THREE from "three";
import { mulberry32, hash2 } from "./noise";

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

export function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const texCache = new Map<string, THREE.CanvasTexture>();

function cached(key: string, make: () => THREE.CanvasTexture): THREE.CanvasTexture {
  if (texCache.has(key)) return texCache.get(key) as THREE.CanvasTexture;
  const t = make();
  texCache.set(key, t);
  return t;
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, base: [number, number, number], spread: number) {
  for (let i = 0; i < w * h * 0.4; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const off = (rng() - 0.5) * spread;
    ctx.fillStyle = `rgba(${base[0] + off},${base[1] + off},${base[2] + off},${0.25 + rng() * 0.3})`;
    ctx.fillRect(x, y, 1 + rng() * 1.5, 1 + rng() * 1.5);
  }
}

export function asphaltTexture(seed = 7, wet = false): THREE.CanvasTexture {
  return cached(`asphalt-${seed}-${wet}`, () => {
    const { canvas, ctx } = makeCanvas(128, 128);
    ctx.fillStyle = wet ? "#2a2e33" : "#3b3d40";
    ctx.fillRect(0, 0, 128, 128);
    speckle(ctx, 128, 128, mulberry32(seed + 3), wet ? [45, 48, 54] : [62, 63, 66], 22);
    if (wet) {
      ctx.fillStyle = "rgba(160,180,200,0.10)";
      for (let i = 0; i < 24; i++) {
        const x = mulberry32(seed + i)() * 128;
        const y = mulberry32(i + 7)() * 128;
        ctx.fillRect(x, y, 2 + mulberry32(i + 1)() * 4, 1);
      }
    }
    const t = toTexture(canvas);
    t.repeat.set(6, 6);
    return t;
  });
}

export function sidewalkTexture(): THREE.CanvasTexture {
  return cached("sidewalk", () => {
    const { canvas, ctx } = makeCanvas(128, 128);
    ctx.fillStyle = "#9a9490";
    ctx.fillRect(0, 0, 128, 128);
    speckle(ctx, 128, 128, mulberry32(51), [150, 146, 140], 14);
    ctx.strokeStyle = "rgba(80,78,75,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 126, 126);
    const t = toTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return t;
  });
}

export function grassTexture(seed = 7): THREE.CanvasTexture {
  return cached(`grass-${seed}`, () => {
    const { canvas, ctx } = makeCanvas(64, 64);
    ctx.fillStyle = "#4a7a3a";
    ctx.fillRect(0, 0, 64, 64);
    speckle(ctx, 64, 64, mulberry32(seed), [74, 106, 58], 26);
    const t = toTexture(canvas);
    t.repeat.set(8, 8);
    return t;
  });
}

export function parkGrassTexture(): THREE.CanvasTexture {
  return cached("parkgrass", () => {
    const { canvas, ctx } = makeCanvas(64, 64);
    ctx.fillStyle = "#3f6f31";
    ctx.fillRect(0, 0, 64, 64);
    speckle(ctx, 64, 64, mulberry32(22), [64, 102, 52], 30);
    const t = toTexture(canvas);
    t.repeat.set(10, 10);
    return t;
  });
}

export function sandTexture(): THREE.CanvasTexture {
  return cached("sand", () => {
    const { canvas, ctx } = makeCanvas(64, 64);
    ctx.fillStyle = "#d9c08a";
    ctx.fillRect(0, 0, 64, 64);
    speckle(ctx, 64, 64, mulberry32(9), [214, 188, 136], 22);
    ctx.fillStyle = "rgba(120,100,60,0.15)";
    const rng = mulberry32(4);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(rng() * 64, rng() * 64, 8 + rng() * 10, 3 + rng() * 4, rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const t = toTexture(canvas);
    t.repeat.set(14, 14);
    return t;
  });
}

export function dirtTexture(): THREE.CanvasTexture {
  return cached("dirt", () => {
    const { canvas, ctx } = makeCanvas(64, 64);
    ctx.fillStyle = "#8a7157";
    ctx.fillRect(0, 0, 64, 64);
    speckle(ctx, 64, 64, mulberry32(3), [138, 118, 90], 26);
    const t = toTexture(canvas);
    t.repeat.set(6, 6);
    return t;
  });
}

export function laneDashTexture(): THREE.CanvasTexture {
  return cached("lanedash", () => {
    const { canvas, ctx } = makeCanvas(32, 128);
    ctx.fillStyle = "#2f2f31";
    ctx.fillRect(0, 0, 32, 128);
    ctx.fillStyle = "#e8e3d0";
    ctx.fillRect(8, 10, 16, 52);
    const t = toTexture(canvas);
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 3);
    return t;
  });
}

export function crosswalkTexture(): THREE.CanvasTexture {
  return cached("crosswalk", () => {
    const { canvas, ctx } = makeCanvas(128, 32);
    ctx.fillStyle = "#2f2f31";
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = "#e3e3dd";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(6 + i * 26, 2, 14, 28);
    }
    const t = toTexture(canvas);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

export function curbTexture(): THREE.CanvasTexture {
  return cached("curb", () => {
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = "#7d7a76";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#9b9892";
    ctx.fillRect(0, 0, 32, 10);
    const t = toTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

export interface FacadeStyle {
  frame: string;
  window: string;
  glow: string;
}

const FACADE_STYLES: FacadeStyle[] = [
  { frame: "#1c2532", window: "#cfe0f2", glow: "#ffd27a" },
  { frame: "#2a2233", window: "#d8eaff", glow: "#ffe3a0" },
  { frame: "#18202b", window: "#b9d4e8", glow: "#ffd69b" },
  { frame: "#241e2c", window: "#d3e6ff", glow: "#ffe0a8" },
];

export function facadeTexture(seed: number, floors: number, styleIdx = 0, night = false): THREE.CanvasTexture {
  const key = `fac-${seed}-${floors}-${styleIdx}-${night}`;
  return cached(key, () => {
    const cols = 4;
    const rows = floors;
    const w = 128;
    const h = 256;
    const { canvas, ctx } = makeCanvas(w, h);
    const st = FACADE_STYLES[styleIdx % FACADE_STYLES.length];
    ctx.fillStyle = st.frame;
    ctx.fillRect(0, 0, w, h);
    const pW = 24;
    const pH = 46;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = hash2(seed + c * 31, r * 17 + styleIdx) > (night ? 0.35 : 0.92);
        ctx.fillStyle = st.window;
        ctx.globalAlpha = lit ? 1 : 0.18;
        ctx.fillRect(9 + c * 31, 9 + r * 30, pW, pH);
        ctx.globalAlpha = 1;
        ctx.fillStyle = st.frame;
        ctx.fillRect(9 + c * 31, 9 + r * 30, pW, 3);
      }
    }
    return toTexture(canvas);
  });
}

export function neonSignTexture(text: string, color: string, w = 256, h = 96): THREE.CanvasTexture {
  const key = `neon-${text}`;
  return cached(key, () => {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${h * 0.45}px sans-serif`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2);
    ctx.shadowBlur = 0;
    return toTexture(canvas);
  });
}

export function billboardTexture(title: string, accent: string, bg: string): THREE.CanvasTexture {
  const key = `bill-${title}`;
  return cached(key, () => {
    const { canvas, ctx } = makeCanvas(256, 128);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, 256, 26);
    ctx.fillStyle = "#f5f2ea";
    ctx.font = "bold 46px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, 128, 84);
    ctx.fillStyle = accent;
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("MERIDIAN BAY", 128, 26);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 250, 122);
    return toTexture(canvas);
  });
}

export function waterTexture(): THREE.CanvasTexture {
  return cached("water", () => {
    const { canvas, ctx } = makeCanvas(128, 128);
    ctx.fillStyle = "rgba(40,120,150,0.85)";
    ctx.fillRect(0, 0, 128, 128);
    const rng = mulberry32(19);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(220,240,255,${0.08 + rng() * 0.1})`;
      ctx.lineWidth = 1 + rng() * 1.5;
      ctx.beginPath();
      const x = rng() * 128;
      const y = rng() * 128;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 10, y - 3, x + 20, y + 3, x + 30, y);
      ctx.stroke();
    }
    const t = toTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 20);
    return t;
  });
}

export function rendererDpr(quality: "low" | "medium" | "high"): number {
  return quality === "low" ? 1 : quality === "medium" ? 1.5 : 2;
}