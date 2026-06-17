import { getCtx, getDest } from './context';
import { minFreq, maxFreq } from '../config';
import type { ToneVoice } from '../types';

let _toneVoices: ToneVoice[] | null = null;
let _toneMaster: GainNode | null = null;

export function playTone(freq: number, vol?: number) {
  const c = getCtx();
  stopTone();
  const v = vol || 0.25;
  const t = c.currentTime;

  _toneMaster = c.createGain();
  _toneMaster.gain.setValueAtTime(0, t);
  _toneMaster.gain.linearRampToValueAtTime(v * 0.15, t + 0.15);
  _toneMaster.gain.linearRampToValueAtTime(v * 0.6, t + 0.4);
  _toneMaster.gain.linearRampToValueAtTime(v, t + 0.8);

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(freq * 4, 3000), t);
  lp.Q.value = 0.3;
  _toneMaster.connect(lp);
  lp.connect(getDest());

  const vib = c.createOscillator();
  const vibGain = c.createGain();
  vib.type = 'sine';
  vib.frequency.setValueAtTime(3.8, t);
  vibGain.gain.setValueAtTime(0, t);
  vibGain.gain.linearRampToValueAtTime(freq * 0.004, t + 0.5);
  vib.connect(vibGain);
  vib.start(t);

  _toneVoices = [{ osc: vib, gain: vibGain }];

  const voices: [number, number, number][] = [
    [1, 0.30, 0],
    [1, 0.10, 4],
    [1, 0.10, -4],
    [1.5, 0.08, 0],
    [1.5, 0.03, 3],
    [2, 0.07, 0],
    [2, 0.03, 5],
    [3, 0.015, 0],
    [0.5, 0.06, 0],
    [0.5, 0.03, 5],
  ];

  voices.forEach(([mult, amp, detune]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * mult, t);
    o.detune.setValueAtTime(detune, t);
    vibGain.connect(o.frequency);
    g.gain.setValueAtTime(amp, t);
    o.connect(g);
    g.connect(_toneMaster!);
    o.start(t);
    _toneVoices!.push({ osc: o, gain: g, mult, detune });
  });
}

export function updateToneFreq(freq: number) {
  if (!_toneVoices) return;
  const c = getCtx();
  const t = c.currentTime;
  _toneVoices.forEach(v => {
    if (v.mult != null) {
      v.osc.frequency.setValueAtTime(freq * v.mult, t);
    }
  });
  if (_toneVoices[0]) {
    _toneVoices[0].gain.gain.setValueAtTime(freq * 0.003, t);
  }
}

export function stopTone(fast?: boolean) {
  if (_toneVoices) {
    try {
      const c = getCtx();
      const t = c.currentTime;
      if (fast) {
        _toneMaster!.gain.linearRampToValueAtTime(0, t + 0.3);
        const voices = _toneVoices;
        setTimeout(() => { voices.forEach(v => { try { v.osc.stop(); } catch { /* noop */ } }); }, 400);
      } else {
        _toneMaster!.gain.linearRampToValueAtTime(_toneMaster!.gain.value * 0.3, t + 0.4);
        _toneMaster!.gain.linearRampToValueAtTime(0, t + 1.2);
        const voices = _toneVoices;
        setTimeout(() => { voices.forEach(v => { try { v.osc.stop(); } catch { /* noop */ } }); }, 1400);
      }
    } catch { /* noop */ }
  }
  _toneVoices = null;
  _toneMaster = null;
}

export function freqFromNorm(t: number): number {
  const lo = minFreq(), hi = maxFreq();
  return lo * Math.pow(hi / lo, t);
}

export function normFromFreq(f: number): number {
  const lo = minFreq(), hi = maxFreq();
  return Math.log(f / lo) / Math.log(hi / lo);
}
