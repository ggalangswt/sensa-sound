import { COUNTDOWN_WORDS, ROUNDS, modeLabel } from '../config';
import { state } from '../state';
import { show } from '../utils/dom';
import { SFX } from '../audio/sfx';
import { runListen, resetRoundLock } from './play';
import { resetResultLock } from './result';

const countdownScreen = document.getElementById('countdown-screen')!;
const countdownWord = document.getElementById('countdown-word')!;
const countdownRound = document.getElementById('countdown-round')!;

export let _countdownIv: ReturnType<typeof setInterval> | null = null;

export function clearCountdown() {
  if (_countdownIv) {
    clearInterval(_countdownIv);
    _countdownIv = null;
  }
}

export function runCountdown() {
  resetRoundLock();
  resetResultLock();
  clearCountdown();
  show(countdownScreen);
  countdownRound.textContent = state.round + '/' + ROUNDS + '  ' + modeLabel();
  let idx = 0;
  countdownWord.textContent = COUNTDOWN_WORDS[0];
  countdownWord.style.opacity = '1';
  SFX.blipReady();

  _countdownIv = setInterval(() => {
    idx++;
    if (idx < COUNTDOWN_WORDS.length) {
      countdownWord.style.opacity = '0';
      setTimeout(() => {
        countdownWord.textContent = COUNTDOWN_WORDS[idx];
        countdownWord.style.opacity = '1';
        if (idx === 1) SFX.blipSet();
        if (idx === 2) SFX.blipGo();
      }, 150);
    } else {
      clearCountdown();
      runListen();
    }
  }, 1000);
}
