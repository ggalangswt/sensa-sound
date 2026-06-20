import { unlockAudio } from '../audio/context';
import { SFX } from '../audio/sfx';
import { trackEvent } from '../utils/gtag';

let _droneStarted = false;
let _unlocking = false;

async function dismissAudioGate() {
  const gate = document.getElementById('audio-gate');
  if (!gate || _droneStarted || _unlocking) return;
  const gateBtn = gate.querySelector('.gate-btn') as HTMLButtonElement | null;
  const gateSub = gate.querySelector('.gate-sub') as HTMLElement | null;

  _unlocking = true;
  if (gateBtn) {
    gateBtn.disabled = true;
    gateBtn.textContent = 'Turning on...';
  }

  const unlocked = await unlockAudio();
  if (!unlocked) {
    _unlocking = false;
    if (gateBtn) {
      gateBtn.disabled = false;
      gateBtn.textContent = 'Try again';
    }
    if (gateSub) {
      gateSub.textContent = 'Sound is blocked. Turn up media volume, then try again.';
    }
    return;
  }

  _droneStarted = true;
  trackEvent('audio_gate_dismiss');
  SFX.droneStart();
  gate.classList.add('dismissed');
  window.dispatchEvent(new CustomEvent('sensa:audio-ready'));
  setTimeout(() => { gate.style.display = 'none'; }, 500);
}

export function initAudioGate() {
  const gate = document.getElementById('audio-gate');
  if (!gate) return;

  const gateSheet = gate.querySelector('.gate-sheet') as HTMLElement;
  const gateBtn = gate.querySelector('.gate-btn') as HTMLElement;
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;

  if (gateBtn) {
    gateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void dismissAudioGate();
    });
  }

  if (isDesktop) {
    gate.addEventListener('click', () => void dismissAudioGate());
    gate.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') void dismissAudioGate();
    });
    return;
  }

  // Mobile drag-to-dismiss
  let startY = 0, currentY = 0, dragging = false;
  let sheetH = 0;
  let velocityY = 0, lastY = 0, lastT = 0;
  const DISMISS_THRESHOLD = 0.35;
  const VELOCITY_THRESHOLD = 800;
  const RUBBER = 0.35;

  function onStart(e: TouchEvent | MouseEvent) {
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startY = y; currentY = y; dragging = true;
    sheetH = gateSheet.offsetHeight;
    velocityY = 0; lastY = y; lastT = performance.now();
    gate!.classList.add('dragging');
  }

  function onMove(e: TouchEvent | MouseEvent) {
    if (!dragging) return;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    currentY = y;
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) velocityY = (y - lastY) / dt * 1000;
    lastY = y; lastT = now;

    let dy = currentY - startY;
    if (dy < 0) dy = dy * RUBBER;
    gateSheet.style.transform = 'translateY(' + dy + 'px)';
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    gate!.classList.remove('dragging');
    const dy = currentY - startY;
    const fraction = dy / sheetH;

    if (fraction > DISMISS_THRESHOLD || velocityY > VELOCITY_THRESHOLD) {
      void dismissAudioGate();
    } else {
      gateSheet.style.transform = 'translateY(0)';
    }
  }

  gateSheet.addEventListener('touchstart', onStart, { passive: true });
  gateSheet.addEventListener('touchmove', onMove, { passive: true });
  gateSheet.addEventListener('touchend', onEnd);

  gate.addEventListener('click', (e) => {
    if (e.target === gate) void dismissAudioGate();
  });
}
