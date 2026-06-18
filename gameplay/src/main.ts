import './style.css';
import { initAudioListeners } from './audio/context';
import { initAllShimmers } from './utils/dom';
import { initDarkMode } from './ui/dark-mode';
import { initMuteToggle } from './ui/mute-toggle';
import { initAudioGate } from './ui/audio-gate';
import { initSfxGuard } from './ui/sfx-guard';
import { startGame } from './screens/game-flow';
import { getInitPayload, postToParent, setInitPayload } from './runtime';
import type { SoundInitPayload } from './types';

// Import screens to register their event listeners
import './screens/intro';
import './screens/countdown';
import './screens/play';
import './screens/result';
import './screens/total';

// Error handler
window.onerror = function (msg, src) {
  if (src && typeof src === 'string' && src.indexOf('adsbygoogle') !== -1) return true;
  if (typeof msg === 'string' && msg.indexOf('adsbygoogle') !== -1) return true;
  const es = document.getElementById('error-screen') as HTMLElement | null;
  if (es && !(es as HTMLElement & { _shown?: boolean })._shown) {
    (es as HTMLElement & { _shown?: boolean })._shown = true;
    es.style.display = 'flex';
    const gc = document.getElementById('game-container');
    if (gc) gc.style.display = 'none';
  }
  return undefined;
};

// Init
initAudioListeners();
initDarkMode();
initMuteToggle();
initAudioGate();

// Wait for fonts, then reveal
document.fonts.ready.then(() => {
  document.body.classList.add('ready');
  initAllShimmers();
  initSfxGuard();
});

// Fallback if fonts.ready takes too long
setTimeout(() => {
  document.body.classList.add('ready');
}, 2000);

let audioReady = false;
let gameStarted = false;

function maybeStartGame() {
  if (!audioReady || gameStarted) return;
  if (window.parent !== window && !getInitPayload()) return;
  gameStarted = true;
  startGame();
}

window.addEventListener('sensa:audio-ready', () => {
  audioReady = true;
  maybeStartGame();
});

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window.parent) return;
  const data = event.data as
    | { type?: string; payload?: SoundInitPayload }
    | undefined;
  if (data?.type !== 'sensa-sound:init' || !data.payload) return;

  setInitPayload(data.payload);
  if (gameStarted) {
    startGame();
  } else {
    maybeStartGame();
  }
});

postToParent('sensa-sound:ready');
