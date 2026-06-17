import { ROUNDS, octaveShift, modeLabel } from '../config';
import { state } from '../state';
import { show } from '../utils/dom';
import { stopTone, freqFromNorm } from '../audio/tone';
import { startAnim, stopAnim } from '../utils/animation';
import { drawResultOverlay } from '../visual/gradient';
import { getFeedback } from '../scoring';
import { animateScoreClimb } from '../ui/score-animation';
import { showTotal } from './total';
import { nextRound } from './game-flow';

const resultScreen = document.getElementById('result-screen')!;
const resultBackC = document.getElementById('result-canvas-back') as HTMLCanvasElement;
const resultFrontC = document.getElementById('result-canvas-front') as HTMLCanvasElement;
const resultRound = document.getElementById('result-round')!;
const resultScore = document.getElementById('result-score')!;
const resultFeedback = document.getElementById('result-feedback')!;
const resultTargetNum = document.getElementById('result-target-num')!;
const resultTargetLabel = document.getElementById('result-target-label')!;
const resultTargetUnit = document.getElementById('result-target-unit')!;
const resultPickHz = document.querySelector('#result-pick-hz .result-hz-num') as HTMLElement;
const resultGo = document.getElementById('result-go')!;

let _resultLocked = false;

export function resetResultLock() {
  _resultLocked = false;
}

export function showResult(targetNorm: number, pickNorm: number, score: number) {
  let tFreq = freqFromNorm(targetNorm);
  if (octaveShift === 1) tFreq *= 2;
  else if (octaveShift === -1) tFreq /= 2;
  const pFreq = freqFromNorm(pickNorm);

  resultRound.textContent = state.round + '/' + ROUNDS + '  ' + modeLabel();

  const intEl = resultScore.querySelector('.score-int') as HTMLElement;
  const decEl = resultScore.querySelector('.score-dec') as HTMLElement;
  if (intEl) intEl.textContent = '0';
  if (decEl) decEl.textContent = '00';

  resultFeedback.textContent = '';

  // Target label — show original freq in octave mode
  const origFreq = freqFromNorm(targetNorm);
  resultTargetLabel.textContent = octaveShift !== 0
    ? 'target (played ' + origFreq.toFixed(2) + ' Hz)'
    : 'target';

  // Target Hz with digit roll animation
  resultTargetNum.innerHTML = '';
  const targetStr = tFreq.toFixed(2);
  targetStr.split('').forEach((ch) => {
    const span = document.createElement('span');
    span.className = 'hz-digit';
    span.textContent = ch;
    resultTargetNum.appendChild(span);
  });

  // Pick Hz as plain text
  resultPickHz.textContent = pFreq.toFixed(2);

  show(resultScreen);

  // Reset roll classes and force reflow
  resultTargetLabel.classList.remove('roll');
  resultTargetUnit.classList.remove('roll');
  void resultTargetLabel.offsetWidth;

  // Animate target digits
  setTimeout(() => resultTargetLabel.classList.add('roll'), 150);
  const digits = resultTargetNum.querySelectorAll('.hz-digit');
  digits.forEach((d, i) => {
    setTimeout(() => d.classList.add('roll'), 250 + i * 40);
  });
  setTimeout(() => resultTargetUnit.classList.add('roll'), 250 + digits.length * 40);

  // Score animation after digits are revealed
  const scoreDelay = 300 + digits.length * 40;
  setTimeout(() => {
    animateScoreClimb(resultScore, score, 600 + (score / 10) * 400, () => {
      resultFeedback.textContent = getFeedback(score);
    });
  }, scoreDelay);

  // Waveform overlay
  startAnim('result', () => drawResultOverlay(resultBackC, resultFrontC, targetNorm, pickNorm));
}

resultGo.addEventListener('click', () => {
  if (_resultLocked) return;
  _resultLocked = true;
  stopTone(true);
  stopAnim('result');

  if (state.round >= ROUNDS) {
    showTotal();
  } else {
    nextRound();
  }
});
