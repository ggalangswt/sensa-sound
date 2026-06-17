import { ROUNDS, MEMORIZE_MS, hardMode, octaveShift, modeLabel } from '../config';
import { state } from '../state';
import { show } from '../utils/dom';
import { playTone, updateToneFreq, stopTone, freqFromNorm } from '../audio/tone';
import { startAnim, stopAnim } from '../utils/animation';
import { drawDualWave, setDragIntensity, _dragIntensity } from '../visual/gradient';
import { scoreRound } from '../scoring';
import { analytics } from '../utils/analytics';
import { showResult } from './result';

const playScreen = document.getElementById('play-screen')!;
const playBackC = document.getElementById('play-canvas-back') as HTMLCanvasElement;
const playFrontC = document.getElementById('play-canvas-front') as HTMLCanvasElement;
const playRound = document.getElementById('play-round')!;
const timerInt = document.getElementById('timer-int')!;
const timerDec = document.getElementById('timer-dec')!;
const playHzNum = document.getElementById('play-hz-num')!;
const playGo = document.getElementById('play-go')!;

let _playNorm = 0.5;
let _playPhase: 'listen' | 'tune' = 'listen';
let _timerRaf: number | null = null;
let _roundLocked = false;

export function resetRoundLock() {
  _roundLocked = false;
}

export function cancelTimerRaf() {
  if (_timerRaf) {
    cancelAnimationFrame(_timerRaf);
    _timerRaf = null;
  }
}

export function runListen() {
  cancelTimerRaf();
  const target = state.targets[state.round - 1];
  _playNorm = target;
  _playPhase = 'listen';
  _roundLocked = false;

  playRound.textContent = state.round + '/' + ROUNDS + '  ' + modeLabel();

  playScreen.classList.add('listening');
  playScreen.classList.remove('tuning');

  const memDuration = hardMode ? 1250 : MEMORIZE_MS;
  timerInt.textContent = String(Math.floor(memDuration / 1000));
  timerInt.className = '';
  timerDec.textContent = '00';
  playHzNum.textContent = '';

  show(playScreen);

  // Wave animation uses _playNorm by reference
  startAnim('play', () => drawDualWave(playBackC, playFrontC, _playNorm));

  let startTime: number | null = null;
  let lastInt = Math.floor(memDuration / 1000);

  // Delay tone start by 500ms for staggered entrance
  setTimeout(() => {
    playTone(freqFromNorm(target), 0.25);
    startTime = performance.now();

    function tick() {
      const elapsed = performance.now() - startTime!;
      const remaining = Math.max(0, memDuration - elapsed);
      const secs = remaining / 1000;
      const intPart = Math.floor(secs);
      const decPart = Math.min(99, Math.floor((secs - intPart) * 100));

      if (remaining <= 0) {
        timerInt.className = '';
        timerInt.textContent = '0';
        timerDec.textContent = '00';
        _timerRaf = null;
        transitionToTune();
        return;
      }

      if (intPart !== lastInt) {
        timerInt.className = 'num-out';
        setTimeout(() => {
          timerInt.textContent = String(intPart);
          timerInt.className = 'num-in';
        }, 120);
        lastInt = intPart;
      }

      timerDec.textContent = String(decPart).padStart(2, '0');
      _timerRaf = requestAnimationFrame(tick);
    }
    _timerRaf = requestAnimationFrame(tick);
  }, 500);
}

function transitionToTune() {
  stopTone(true);

  setTimeout(() => {
    _playPhase = 'tune';
    setDragIntensity(0);

    const target = state.targets[state.round - 1];
    const minDist = hardMode ? 0.3 : 0.15;
    let startNorm: number;
    do {
      startNorm = 0.05 + Math.random() * 0.9;
    } while (Math.abs(startNorm - target) < minDist);
    _playNorm = startNorm;

    playScreen.classList.remove('listening');
    playScreen.classList.add('tuning');

    const playWm = document.getElementById('play-wm');
    const playHzUnit = document.getElementById('play-hz-unit');
    if (playWm) playWm.style.opacity = '';
    playHzNum.textContent = hardMode ? '' : freqFromNorm(_playNorm).toFixed(2);
    if (playHzUnit) playHzUnit.style.opacity = hardMode ? '0' : '';

    playTone(freqFromNorm(_playNorm), 0.2);
  }, 400);
}

// Touch/drag system
(function setupTouch() {
  let dragging = false;
  let lastY = 0;

  function decayIntensity() {
    if (_dragIntensity > 0.005) {
      setDragIntensity(_dragIntensity * 0.94);
      requestAnimationFrame(decayIntensity);
    } else {
      setDragIntensity(0);
    }
  }

  playScreen.addEventListener('pointerdown', (e: PointerEvent) => {
    if (_playPhase !== 'tune') return;
    if ((e.target as HTMLElement).closest('.go-btn')) return;
    dragging = true;
    lastY = e.clientY;
    playScreen.setPointerCapture(e.pointerId);
  });

  playScreen.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging || _playPhase !== 'tune') return;
    const dy = lastY - e.clientY;
    lastY = e.clientY;
    const sensitivity = 1.2 / window.innerHeight;
    _playNorm = Math.max(0, Math.min(1, _playNorm + dy * sensitivity));
    if (!hardMode) playHzNum.textContent = freqFromNorm(_playNorm).toFixed(2);
    updateToneFreq(freqFromNorm(_playNorm));
    setDragIntensity(Math.min(1, _dragIntensity + 0.04));
  });

  playScreen.addEventListener('pointerup', () => { dragging = false; decayIntensity(); });
  playScreen.addEventListener('pointercancel', () => { dragging = false; decayIntensity(); });
})();

// Submit
playGo.addEventListener('click', () => {
  if (_roundLocked) return;
  _roundLocked = true;
  const playWm = document.getElementById('play-wm');
  if (playWm) playWm.style.opacity = '0';
  playScreen.classList.remove('tuning');
  stopTone(true);
  stopAnim('play');
  setDragIntensity(0);
  cancelTimerRaf();

  const pick = _playNorm;
  const target = state.targets[state.round - 1];
  state.picks.push(pick);
  const score = scoreRound(target, pick);
  state.roundScores.push(score);
  state.totalScore = Math.round((state.totalScore + score) * 100) / 100;

  analytics.log('round_complete', {
    round: state.round,
    score,
    target,
    pick,
    mode: hardMode ? 'hard' : 'easy',
    octave: octaveShift,
  });

  showResult(target, pick, score);
});
