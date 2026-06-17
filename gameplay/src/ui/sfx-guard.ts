import { SFX } from '../audio/sfx';

let _hoverCooldown = 0;

function guardedHover() {
  const now = performance.now();
  if (now - _hoverCooldown < 80) return;
  _hoverCooldown = now;
  SFX.hover();
}

export function markCooldown() {
  _hoverCooldown = performance.now() + 500;
}

const _countdownTriggers = new Set(['intro-solo']);

export function initSfxGuard() {
  document.querySelectorAll('button, .go-btn, .intro-mode-btn, .intro-easy-toggle').forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover: hover)').matches) {
        guardedHover();
      }
    });

    el.addEventListener('click', () => {
      if (_countdownTriggers.has(el.id)) {
        markCooldown();
      }
    });
  });
}
