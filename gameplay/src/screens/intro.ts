import { hardMode, setHardMode, octaveShift, setOctaveShift } from '../config';
import { show } from '../utils/dom';
import { SFX } from '../audio/sfx';
import { trackEvent } from '../utils/gtag';
import { stopTone } from '../audio/tone';
import { stopAnim } from '../utils/animation';
import { startIntroWave } from '../visual/intro-wave';
import { startGame, _gameStarting, setGameStarting } from './game-flow';

const introScreen = document.getElementById('intro-screen')!;
const introSolo = document.getElementById('intro-solo')!;
const introEasy = document.getElementById('intro-easy')!;
const gameContainer = document.getElementById('game-container')!;

// Solo button
introSolo.addEventListener('click', () => {
  if (_gameStarting) return;
  SFX.click();
  setGameStarting(true);
  startGame();
  setTimeout(() => setGameStarting(false), 500);
});

// Easy/Hard toggle
function syncToggle() {
  if (hardMode) {
    introEasy.classList.remove('easy');
    introEasy.querySelector('span')!.textContent = 'Hard';
  } else {
    introEasy.classList.add('easy');
    introEasy.querySelector('span')!.textContent = 'Easy';
  }
}

introEasy.addEventListener('click', () => {
  setHardMode(!hardMode);
  trackEvent('toggle_difficulty', { mode: hardMode ? 'hard' : 'easy' });
  if (hardMode) {
    SFX.hardOn();
  } else {
    SFX.hardOff();
  }
  syncToggle();

  const knob = introEasy.querySelector('.toggle-knob') as HTMLElement;
  if (knob) {
    const cls = hardMode ? 'spring-right' : 'spring-left';
    knob.classList.remove('spring-right', 'spring-left');
    void knob.offsetWidth;
    knob.classList.add(cls);
    knob.addEventListener('animationend', () => knob.classList.remove(cls), { once: true });
  }

  gameContainer.classList.add('shaking');
  setTimeout(() => gameContainer.classList.remove('shaking'), 500);
});

syncToggle();

// Octave 3-position toggle: cycles -8va → off → +8va → -8va
const introOctave = document.getElementById('intro-octave')!;
const octaveLabels: Record<number, string> = { [-1]: '−8va', 0: 'Octave', 1: '+8va' };
const octaveClasses: Record<number, string> = { [-1]: 'octave-down', 0: 'octave-off', 1: 'octave-up' };
const octaveCycle: (-1 | 0 | 1)[] = [-1, 0, 1];

function syncOctaveToggle() {
  introOctave.classList.remove('octave-down', 'octave-off', 'octave-up');
  introOctave.classList.add(octaveClasses[octaveShift]);
  introOctave.querySelector('span')!.textContent = octaveLabels[octaveShift];
}

introOctave.addEventListener('click', () => {
  const prev = octaveShift;
  const idx = octaveCycle.indexOf(octaveShift);
  const next = octaveCycle[(idx + 1) % octaveCycle.length];
  setOctaveShift(next);
  trackEvent('toggle_octave', { shift: octaveShift });
  if (next !== 0) {
    SFX.hardOn();
  } else {
    SFX.hardOff();
  }
  syncOctaveToggle();

  const knob = introOctave.querySelector('.toggle-knob') as HTMLElement;
  if (knob) {
    const positions: Record<number, number> = { [-1]: -20, 0: -10, 1: 0 };
    const from = positions[prev];
    const to = positions[next];
    const overshoot = (to - from) * 0.4;
    const steps = [
      { t: 0, x: from },
      { t: 0.18, x: to + overshoot },
      { t: 0.36, x: to - overshoot * 0.4 },
      { t: 0.54, x: to + overshoot * 0.2 },
      { t: 0.72, x: to - overshoot * 0.08 },
      { t: 1, x: to },
    ];
    const keyframes = steps.map(s => ({ transform: `translateX(${s.x}px)`, offset: s.t }));
    knob.style.transition = 'none';
    knob.animate(keyframes, { duration: 550, easing: 'cubic-bezier(0.12, 0, 0.2, 1)', fill: 'none' });
    // Restore CSS transition after animation
    setTimeout(() => { knob.style.transition = ''; }, 560);
  }

  gameContainer.classList.add('shaking');
  setTimeout(() => gameContainer.classList.remove('shaking'), 500);
});

syncOctaveToggle();

// Browser history / popstate
window.addEventListener('popstate', () => {
  const activeScreen = document.querySelector('.screen.active') as HTMLElement;
  if (!activeScreen) return;

  const id = activeScreen.id;
  const midGame = ['countdown-screen', 'play-screen', 'result-screen'].includes(id);

  if (midGame) {
    if (confirm('Leave the current game?')) {
      stopTone(true);
      stopAnim('play');
      stopAnim('result');
      show(introScreen);
      startIntroWave();
    } else {
      history.pushState({ game: true }, '');
    }
  } else {
    show(introScreen);
    startIntroWave();
  }
});

export { introScreen, syncToggle };
