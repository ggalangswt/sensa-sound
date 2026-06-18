import type { GameState } from './types';
import { octaveShift } from './config';
import { normFromFreq } from './audio/tone';
import { minFreq, maxFreq } from './config';

export const state: GameState = {
  round: 0,
  totalScore: 0,
  roundScores: [],
  targets: [],
  picks: [],
  latencies: [],
};

export function resetState() {
  state.round = 0;
  state.totalScore = 0;
  state.roundScores = [];
  state.targets = [];
  state.picks = [];
  state.latencies = [];
}

export function randomTarget(): number {
  let lo = 0.1;
  let hi = 0.9;
  if (octaveShift === 1) {
    // Ensure target * 2 is still reachable on the slider
    hi = Math.min(hi, normFromFreq(maxFreq() / 2));
  } else if (octaveShift === -1) {
    // Ensure target / 2 is still reachable on the slider
    lo = Math.max(lo, normFromFreq(minFreq() * 2));
  }
  return lo + Math.random() * (hi - lo);
}
