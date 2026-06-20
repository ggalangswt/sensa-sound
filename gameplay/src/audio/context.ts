let actx: AudioContext | null = null;
let _audioInterrupted = false;
let _masterGain: GainNode | null = null;
export let _muted = false;

export function setMuted(v: boolean) { _muted = v; }

export function getCtx(): AudioContext {
  if (!actx || actx.state === 'closed') {
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

export async function unlockAudio(): Promise<boolean> {
  const context = getCtx();

  try {
    if (context.state !== 'running') {
      await context.resume();
    }
    if (context.state !== 'running') return false;

    // Android WebViews may not route Web Audio until a source starts inside
    // the same user gesture that resumed the context.
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    oscillator.connect(gain);
    gain.connect(getDest());
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.02);
    _audioInterrupted = false;
    return true;
  } catch {
    return false;
  }
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

export async function reviveAudio() {
  if (!actx) return false;
  if (actx.state === 'suspended' || actx.state === 'interrupted' || _audioInterrupted) {
    try {
      await actx.resume();
      _audioInterrupted = actx.state !== 'running';
    } catch {
      _audioInterrupted = true;
    }
  }
  return actx.state === 'running';
}

export function initAudioListeners() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reviveAudio();
  });
  document.addEventListener('touchstart', reviveAudio, { passive: true });
  document.addEventListener('click', reviveAudio, { passive: true });
}
