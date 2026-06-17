let actx: AudioContext | null = null;
let _audioInterrupted = false;
let _masterGain: GainNode | null = null;
export let _muted = false;

export function setMuted(v: boolean) { _muted = v; }

export function getCtx(): AudioContext {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    actx.addEventListener('statechange', () => {
      if (actx!.state === 'interrupted' || actx!.state === 'suspended') {
        _audioInterrupted = true;
      }
    });
  }
  if (actx.state === 'suspended' || actx.state === 'interrupted') actx.resume();
  if (!_masterGain) {
    _masterGain = actx.createGain();
    _masterGain.connect(actx.destination);
  }
  return actx;
}

export function getDest(): GainNode {
  getCtx();
  return _masterGain!;
}

export function getMasterGain(): GainNode | null {
  return _masterGain;
}

export function getActx(): AudioContext | null {
  return actx;
}

export function reviveAudio() {
  if (!actx) return;
  if (actx.state === 'suspended' || actx.state === 'interrupted' || _audioInterrupted) {
    actx.resume().then(() => { _audioInterrupted = false; }).catch(() => { /* noop */ });
  }
}

export function initAudioListeners() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reviveAudio();
  });
  document.addEventListener('touchstart', reviveAudio, { passive: true });
  document.addEventListener('click', reviveAudio, { passive: true });
}
