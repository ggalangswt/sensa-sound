import { ROUNDS, hardMode, octaveShift } from '../config';
import { state } from '../state';
import { show } from '../utils/dom';
import { SFX } from '../audio/sfx';
import { analytics } from '../utils/analytics';
import { getTotalDescription } from '../scoring';
import { animateScoreClimb } from '../ui/score-animation';
import { startIntroWave } from '../visual/intro-wave';
import { trackEvent } from '../utils/gtag';

const totalScreen = document.getElementById('total-screen')!;
const totalDesc = document.getElementById('total-description')!;
const totalScore = document.getElementById('total-score')!;
const totalRounds = document.getElementById('total-rounds')!;
const totalClose = document.getElementById('total-close')!;
const totalPlayAgainBtn = document.getElementById('total-play-again')!;

export async function showTotal() {
  show(totalScreen);
  analytics.log('game_end', { score: state.totalScore, mode: hardMode ? 'hard' : 'easy', octave: octaveShift });
  analytics.incrementGames();

  // Reset UI
  const intEl = totalScore.querySelector('.score-int') as HTMLElement;
  const decEl = totalScore.querySelector('.score-dec') as HTMLElement;
  if (intEl) intEl.textContent = '0';
  if (decEl) decEl.textContent = '00';
  totalDesc.textContent = '';
  totalRounds.innerHTML = '';

  // Build round columns
  for (let i = 0; i < ROUNDS; i++) {
    const col = document.createElement('div');
    col.className = 'round-col';
    col.innerHTML = '<div class="round-col-label">R' + (i + 1) + '</div><div class="round-col-score">' + (state.roundScores[i] || 0).toFixed(1) + '</div>';
    totalRounds.appendChild(col);
  }

  // Score animation
  setTimeout(() => {
    totalScreen.classList.add('reveal');
    animateScoreClimb(totalScore, state.totalScore, 1200, () => {
      totalDesc.textContent = getTotalDescription(state.totalScore);
    });
  }, 300);
}

// Play again
if (totalPlayAgainBtn) {
  totalPlayAgainBtn.addEventListener('click', () => {
    trackEvent('play_again', { score: state.totalScore, mode: hardMode ? 'hard' : 'easy', octave: octaveShift });
    SFX.click();
    totalScreen.classList.remove('reveal');
    const introScreen = document.getElementById('intro-screen')!;
    show(introScreen);
    startIntroWave();
    SFX.droneStart();
  });
}

// Close button
totalClose.addEventListener('click', () => {
  SFX.clickClose();
  totalScreen.classList.remove('reveal');
  const introScreen = document.getElementById('intro-screen')!;
  show(introScreen);
  startIntroWave();
  SFX.droneStart();
});
