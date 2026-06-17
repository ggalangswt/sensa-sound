import { _muted, setMuted, getMasterGain, getActx } from '../audio/context';
import { SFX } from '../audio/sfx';

export function initMuteToggle() {
  const toggle = document.getElementById('mute-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const newMuted = !_muted;
    setMuted(newMuted);
    const mg = getMasterGain();
    const ctx = getActx();
    if (mg && ctx) {
      mg.gain.setValueAtTime(newMuted ? 0 : 1, ctx.currentTime);
    }
    if (newMuted) {
      toggle.classList.add('muted');
      SFX.droneStop();
    } else {
      toggle.classList.remove('muted');
      SFX.droneStart();
    }
  });
}
