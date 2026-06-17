export const ROUNDS = 5;
export const MEMORIZE_MS = 2500;
export const PI = Math.PI;

export const FREQ_EASY: [number, number] = [80, 1200];
export const FREQ_HARD: [number, number] = [60, 1400];

export const COUNTDOWN_WORDS = ['ready', 'set', 'go'];

export let hardMode = false;
export function setHardMode(v: boolean) { hardMode = v; }

/** -1 = octave down, 0 = off, 1 = octave up */
export let octaveShift: -1 | 0 | 1 = 0;
export function setOctaveShift(v: -1 | 0 | 1) { octaveShift = v; }

export function minFreq() { return hardMode ? FREQ_HARD[0] : FREQ_EASY[0]; }
export function maxFreq() { return hardMode ? FREQ_HARD[1] : FREQ_EASY[1]; }

export function modeLabel(): string {
  const parts: string[] = [];
  parts.push(hardMode ? 'Hard' : 'Easy');
  if (octaveShift === 1) parts.push('+8va');
  else if (octaveShift === -1) parts.push('−8va');
  return parts.join(' · ');
}
