import type { GameState } from './types';

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
