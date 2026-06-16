import { SOUND_DEFAULTS } from "../constants/game";
import type { SoundDifficulty, SoundOctaveShift } from "../types";

function rangeForDifficulty(difficulty: SoundDifficulty): readonly [number, number] {
  return difficulty === "hard"
    ? SOUND_DEFAULTS.hardFrequencyRange
    : SOUND_DEFAULTS.easyFrequencyRange;
}

export function minFreq(difficulty: SoundDifficulty): number {
  return rangeForDifficulty(difficulty)[0];
}

export function maxFreq(difficulty: SoundDifficulty): number {
  return rangeForDifficulty(difficulty)[1];
}

export function freqFromNorm(
  norm: number,
  difficulty: SoundDifficulty,
): number {
  const [min, max] = rangeForDifficulty(difficulty);
  return min * Math.pow(max / min, clampNorm(norm));
}

export function normFromFreq(
  frequencyHz: number,
  difficulty: SoundDifficulty,
): number {
  const [min, max] = rangeForDifficulty(difficulty);
  const ratio = Math.log(frequencyHz / min) / Math.log(max / min);
  return clampNorm(ratio);
}

export function effectiveTargetFrequency(
  targetNorm: number,
  difficulty: SoundDifficulty,
  octaveShift: SoundOctaveShift,
): number {
  const base = freqFromNorm(targetNorm, difficulty);
  if (octaveShift === 1) return base * 2;
  if (octaveShift === -1) return base / 2;
  return base;
}

export function clampNorm(norm: number): number {
  return Math.max(0, Math.min(1, norm));
}
