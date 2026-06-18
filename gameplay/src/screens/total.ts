import { ROUNDS, hardMode, octaveShift } from '../config';
import { state } from '../state';
import { show } from '../utils/dom';
import { SFX } from '../audio/sfx';
import { analytics } from '../utils/analytics';
import { getTotalDescription } from '../scoring';
import { animateScoreClimb } from '../ui/score-animation';
import { trackEvent } from '../utils/gtag';
import { startGame } from './game-flow';
import {
  getInitPayload,
  getLastSubmission,
  listenForSubmissionResult,
  requestExit,
  requestReplay,
  submitMatch,
} from '../runtime';
import type { SoundMatchSubmission, SoundSubmissionResult } from '../types';

const totalScreen = document.getElementById('total-screen')!;
const totalDesc = document.getElementById('total-description')!;
const totalScore = document.getElementById('total-score')!;
const totalRounds = document.getElementById('total-rounds')!;
const totalClose = document.getElementById('total-close')!;
const totalPlayAgainBtn = document.getElementById('total-play-again')!;
let submissionPending = false;
let submissionAccepted = false;

function buildSubmission(): SoundMatchSubmission | null {
  const runtime = getInitPayload();
  if (!runtime) return null;

  return {
    roomId: runtime.roomId,
    walletAddress: runtime.walletAddress,
    submittedAt: new Date().toISOString(),
    difficulty: runtime.gameplayConfig.difficulty,
    octaveShift: runtime.gameplayConfig.octaveShift,
    totalScore: state.totalScore,
    rounds: state.picks.map((pickedNorm, index) => ({
      round: index + 1,
      pickedNorm,
      latencyMs: state.latencies[index] ?? 0,
    })),
  };
}

function setPending(pending: boolean) {
  submissionPending = pending;
  (totalClose as HTMLButtonElement).disabled = pending;
  (totalPlayAgainBtn as HTMLButtonElement).disabled = pending;
}

function sendCurrentSubmission() {
  const submission = getLastSubmission() ?? buildSubmission();
  if (!submission || submissionPending || submissionAccepted) return;

  setPending(true);
  totalDesc.textContent = 'Processing result...';
  totalPlayAgainBtn.textContent = 'Processing...';
  submitMatch(submission);
}

function applySubmissionResult(result: SoundSubmissionResult) {
  setPending(false);
  if (!result.accepted) {
    submissionAccepted = false;
    (totalClose as HTMLButtonElement).disabled = true;
    totalDesc.textContent = result.message ?? 'Submission failed. Try again.';
    totalPlayAgainBtn.textContent = 'Retry';
    return;
  }

  submissionAccepted = true;
  const runtime = getInitPayload();
  if (runtime?.mode !== 'solo') return;

  if (result.outcome === 'refund' || result.refunded) {
    totalDesc.textContent = 'Stake refunded to Vault.';
  } else if (result.outcome === 'prize') {
    totalDesc.textContent = 'Prize added to Vault.';
  } else {
    totalDesc.textContent = result.message ?? 'Result recorded.';
  }
  totalPlayAgainBtn.textContent = 'Play again';
}

listenForSubmissionResult(applySubmissionResult);

export async function showTotal() {
  submissionPending = false;
  submissionAccepted = false;
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
      const runtime = getInitPayload();
      if (runtime?.mode === 'solo' && !runtime.isPractice) {
        sendCurrentSubmission();
      }
    });
  }, 300);

  const runtime = getInitPayload();
  totalPlayAgainBtn.textContent =
    runtime && runtime.mode !== 'solo' ? 'View standings' : 'Play again';
  (totalClose as HTMLButtonElement).disabled =
    Boolean(runtime && !runtime.isPractice);
}

// Play again
if (totalPlayAgainBtn) {
  totalPlayAgainBtn.addEventListener('click', () => {
    trackEvent('play_again', { score: state.totalScore, mode: hardMode ? 'hard' : 'easy', octave: octaveShift });
    SFX.click();
    const runtime = getInitPayload();
    if (!runtime) {
      totalScreen.classList.remove('reveal');
      startGame();
      return;
    }

    if (runtime.mode !== 'solo') {
      sendCurrentSubmission();
      return;
    }

    if (!runtime.isPractice && !submissionAccepted) {
      sendCurrentSubmission();
      return;
    }

    totalScreen.classList.remove('reveal');
    requestReplay();
  });
}

// Close button
totalClose.addEventListener('click', () => {
  if (submissionPending || (getInitPayload() && !getInitPayload()!.isPractice && !submissionAccepted)) {
    return;
  }
  SFX.clickClose();
  totalScreen.classList.remove('reveal');
  if (getInitPayload()) requestExit();
  else startGame();
});
