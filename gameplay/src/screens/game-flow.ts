import { ROUNDS, hardMode, octaveShift } from '../config';
import { state, resetState } from '../state';
import { stopIntroWave } from '../visual/intro-wave';
import { SFX } from '../audio/sfx';
import { analytics } from '../utils/analytics';
import { runCountdown } from './countdown';
import { getInitPayload } from '../runtime';
import { generateSoundRounds } from '../../../src/engine/generator';

export let _gameStarting = false;
export function setGameStarting(v: boolean) { _gameStarting = v; }

export function startGame() {
  history.pushState({ game: true }, '');
  resetState();

  const runtimeConfig = getInitPayload()?.gameplayConfig;
  if (runtimeConfig) {
    state.targets = runtimeConfig.rounds.map((round) => round.targetNorm);
  } else {
    const seed = crypto.randomUUID();
    state.targets = generateSoundRounds(
      seed,
      hardMode ? 'hard' : 'easy',
      octaveShift,
    ).map((round) => round.targetNorm);
  }

  stopIntroWave();
  SFX.droneStop();
  analytics.log('game_start', { mode: hardMode ? 'hard' : 'easy', octave: octaveShift });

  nextRound();
}

export function nextRound() {
  state.round++;
  runCountdown();
}
