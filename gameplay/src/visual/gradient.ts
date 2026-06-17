import type { CanvasSetup } from '../types';
import { PI } from '../config';
import { createNoise3D } from 'simplex-noise';

export const noise3D = createNoise3D();
export const _waveStart = performance.now();
export let _dragIntensity = 0;

export function setDragIntensity(v: number) { _dragIntensity = v; }

export const STRAND_COUNT = 24;
const GRADIENT_STOPS = [
  { pos: 0.0, r: 148, g: 45, b: 220 },
  { pos: 0.25, r: 90, g: 60, b: 235 },
  { pos: 0.5, r: 40, g: 100, b: 240 },
  { pos: 0.75, r: 0, g: 180, b: 220 },
  { pos: 1.0, r: 16, g: 240, b: 160 },
];

function gradientColor(t: number, alpha: number): string {
  let i = 0;
  for (let s = 1; s < GRADIENT_STOPS.length; s++) {
    if (t <= GRADIENT_STOPS[s].pos) { i = s - 1; break; }
  }
  const a = GRADIENT_STOPS[i], b = GRADIENT_STOPS[i + 1] || a;
  const f = (b.pos === a.pos) ? 0 : (t - a.pos) / (b.pos - a.pos);
  const r = Math.round(a.r + (b.r - a.r) * f);
  const g = Math.round(a.g + (b.g - a.g) * f);
  const bl = Math.round(a.b + (b.b - a.b) * f);
  return 'rgba(' + r + ',' + g + ',' + bl + ',' + alpha.toFixed(3) + ')';
}

function drawStrandsVertical(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  normFreq: number, t: number, opMul: number, lineWidth: number, noiseSeed: number
) {
  const N = STRAND_COUNT;
  const nf = Math.pow(normFreq, 0.7);
  const maxAmp = w * (0.015 + nf * 0.38);
  const freq1 = 2.0 + nf * 2.5;
  const freq2 = 3.0 + nf * 4.0;
  const cx = w / 2;
  const d = _dragIntensity;

  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < N; i++) {
    const s = (i / (N - 1)) - 0.5;
    const baseAmp = s * 2 * maxAmp;
    const phaseOff = s * 0.7;
    const edgeProx = Math.abs(s) * 2;
    const op = (0.05 + 0.20 * edgeProx * edgeProx) * opMul;
    const dragBoost = 1 + d * 0.5;

    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    for (let y = 0; y <= h; y += 2) {
      const u = y / h;
      const envelope = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(u * 3.2 * PI + t * 0.15), 1.4);
      const noiseMod = 0.65 + 0.35 * noise3D(u * 1.8, (noiseSeed || 0) * 0.1, t * 0.12);
      const wave = Math.sin(u * freq1 * PI * 2 + t * 0.4 + phaseOff) * 0.6
                 + Math.sin(u * freq2 * PI * 2 + t * 0.22 + phaseOff * 0.5 + 1) * 0.4;
      const x = cx + baseAmp * envelope * noiseMod * wave * dragBoost;

      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const gradT = i / (N - 1);
    ctx.strokeStyle = gradientColor(gradT, Math.min(op * dragBoost, 0.45 * opMul));
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasSetup | null {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return null;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

export function drawDualWave(
  backCanvas: HTMLCanvasElement, frontCanvas: HTMLCanvasElement,
  normFreq: number, time?: number, globalAlpha?: number
) {
  const ga = globalAlpha != null ? globalAlpha : 1;
  const bk = setupCanvas(backCanvas);
  const fr = setupCanvas(frontCanvas);
  if (!bk || !fr) return;
  const t = time != null ? time : (performance.now() - _waveStart) / 1000;
  drawStrandsVertical(bk.ctx, bk.w, bk.h, normFreq, t, ga, 5, 1);
  drawStrandsVertical(fr.ctx, fr.w, fr.h, normFreq, t, ga, 1.1, 1);
}

export function drawResultOverlay(
  backCanvas: HTMLCanvasElement, frontCanvas: HTMLCanvasElement,
  targetNorm: number, pickNorm: number, time?: number
) {
  const bk = setupCanvas(backCanvas);
  const fr = setupCanvas(frontCanvas);
  if (!bk || !fr) return;
  const t = time != null ? time : (performance.now() - _waveStart) / 1000;

  const savedDrag = _dragIntensity;
  _dragIntensity = 0;

  drawStrandsVertical(bk.ctx, bk.w, bk.h, targetNorm, t, 0.5, 5, 1);
  drawStrandsVertical(fr.ctx, fr.w, fr.h, targetNorm, t, 0.5, 1.1, 1);

  drawStrandsVertical(bk.ctx, bk.w, bk.h, pickNorm, t + 100, 1, 5, 2);
  drawStrandsVertical(fr.ctx, fr.w, fr.h, pickNorm, t + 100, 1, 1.1, 2);

  _dragIntensity = savedDrag;
}

export function drawIntroWaveLayer(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  time: number, lineW: number, opMul: number
) {
  const N = STRAND_COUNT;
  const maxAmp = w * 0.24;
  const freq1 = 2.5, freq2 = 4.0;
  const cx = w * 0.72;

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < N; i++) {
    const sf = (i / (N - 1)) - 0.5;
    const baseAmp = sf * 2 * maxAmp;
    const phaseOff = sf * 0.7;
    const edgeProx = Math.abs(sf) * 2;
    const op = (0.05 + 0.22 * edgeProx * edgeProx) * opMul;

    ctx.lineWidth = lineW;
    ctx.beginPath();
    for (let y = 0; y <= h; y += 2) {
      const u = y / h;
      const envelope = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(u * 3.2 * PI + time * 0.15), 1.4);
      const noiseMod = 0.65 + 0.35 * noise3D(u * 1.8, 0, time * 0.12);
      const wave = Math.sin(u * freq1 * PI * 2 + time * 0.4 + phaseOff) * 0.6
                 + Math.sin(u * freq2 * PI * 2 + time * 0.22 + phaseOff * 0.5 + 1) * 0.4;
      const x = cx + baseAmp * envelope * noiseMod * wave;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = gradientColor(i / (N - 1), Math.min(op, 0.5 * opMul));
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}
