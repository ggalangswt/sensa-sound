import { getCtx, getDest } from './context';

function tone(freq: number, dur: number, vol: number, type?: OscillatorType) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(getDest());
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur);
  } catch { /* noop */ }
}

const _keyNotes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
let _keyIdx = 0;

function keystroke() {
  try {
    const c = getCtx(); const t = c.currentTime;
    const f0 = _keyNotes[_keyIdx % _keyNotes.length];
    _keyIdx++;
    const master = c.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.09, t + 0.008);
    master.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    master.connect(getDest());
    [1, 2, 3].forEach((h, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0 * h, t);
      g.gain.setValueAtTime([0.35, 0.15, 0.06][i], t);
      g.gain.exponentialRampToValueAtTime(0.001, t + [0.1, 0.06, 0.04][i]);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.12);
    });
  } catch { /* noop */ }
}

function _droneChord(freqs: number[], vol: number, sustain: number, decay: number) {
  try {
    const c = getCtx(); const t = c.currentTime;
    const master = c.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(vol, t + 0.06);
    master.gain.linearRampToValueAtTime(vol * 0.85, t + sustain);
    master.gain.exponentialRampToValueAtTime(0.001, t + sustain + decay);

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 0.5;
    master.connect(lp); lp.connect(getDest());

    freqs.forEach(f => {
      [0, 3, -3].forEach(det => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        o.detune.setValueAtTime(det, t);
        g.gain.setValueAtTime(det === 0 ? 0.35 : 0.15, t);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + sustain + decay + 0.05);
      });
    });
  } catch { /* noop */ }
}

function blipReady() { _droneChord([55, 82.4, 110], 0.26, 0.45, 0.5); }
function blipSet() { _droneChord([65.4, 98, 130.8], 0.26, 0.45, 0.5); }
function blipGo() { _droneChord([82.4, 123.5, 165], 0.28, 0.5, 0.7); }

function scoreTick(progress: number, isInt: boolean) {
  try {
    const c = getCtx(); const t = c.currentTime;
    const freq = 523 * Math.pow(2, progress * 2);
    const vol = isInt ? 0.12 : 0.06;
    const dur = isInt ? 0.12 : 0.05;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.setValueAtTime(freq * 1.01, t + dur * 0.5);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(getDest());
    o.start(t); o.stop(t + dur + 0.02);
  } catch { /* noop */ }
}

function scoreLand() {
  try {
    const c = getCtx(); const t = c.currentTime;
    [1046, 1318, 1568].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + i * 0.02);
      g.gain.setValueAtTime(0.1, t + i * 0.02);
      g.gain.linearRampToValueAtTime(0.08, t + i * 0.02 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.02 + 0.2);
      o.connect(g); g.connect(getDest());
      o.start(t + i * 0.02); o.stop(t + i * 0.02 + 0.55);
    });
  } catch { /* noop */ }
}

function submit() {
  try {
    const c = getCtx(); const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, t);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(getDest());
    o.start(t); o.stop(t + 0.12);
  } catch { /* noop */ }
}

function hover() {
  try {
    const f0 = 440;
    const c = getCtx(); const t = c.currentTime;
    const master = c.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.18, t + 0.01);
    master.gain.linearRampToValueAtTime(0.12, t + 0.015);
    master.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    master.connect(getDest());
    [1, 2, 3, 5].forEach((h, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0 * h, t);
      g.gain.setValueAtTime([0.32, 0.12, 0.06, 0.03][i], t);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.06);
    });
  } catch { /* noop */ }
}

function click() {
  try {
    const f0 = 330;
    const c = getCtx(); const t = c.currentTime;
    const master = c.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.22, t + 0.005);
    master.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    master.connect(getDest());
    [1, 2, 3, 4, 6].forEach((h, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0 * h, t);
      g.gain.setValueAtTime([0.28, 0.12, 0.07, 0.04, 0.02][i], t);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.09);
    });
  } catch { /* noop */ }
}

function clickClose() {
  try {
    const c = getCtx(); const t = c.currentTime;
    const f0 = 220;
    const master = c.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.18, t + 0.01);
    master.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1200; lp.Q.value = 0.4;
    master.connect(lp); lp.connect(getDest());
    [1, 0.75, 0.5].forEach((mult, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0 * mult, t + i * 0.015);
      g.gain.setValueAtTime([0.30, 0.18, 0.10][i], t + i * 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.015 + 0.09);
      o.connect(g); g.connect(master);
      o.start(t + i * 0.015); o.stop(t + i * 0.015 + 0.1);
    });
  } catch { /* noop */ }
}

function _sweepChord(freqs: number[], vol: number, dur: number) {
  try {
    const c = getCtx(); const t = c.currentTime;
    const master = c.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(vol, t + 0.04);
    master.gain.linearRampToValueAtTime(vol * 0.6, t + dur * 0.6);
    master.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
    master.connect(lp); lp.connect(getDest());
    freqs.forEach((f, fi) => {
      [0, 4, -4].forEach(det => {
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, t + fi * 0.015);
        o.detune.setValueAtTime(det, t);
        g.gain.setValueAtTime(det === 0 ? 0.3 : 0.12, t + fi * 0.015);
        o.connect(g); g.connect(master);
        o.start(t + fi * 0.015); o.stop(t + dur + 0.05);
      });
    });
  } catch { /* noop */ }
}

function hardOn() { _sweepChord([82.4, 110, 164.8, 220], 0.22, 0.6); }
function hardOff() { _sweepChord([220, 164.8, 110, 82.4], 0.18, 0.5); }

let _droneOscs: OscillatorNode[] = [];
let _droneGain: GainNode | null = null;

function droneStart() {
  try {
    if (_droneOscs.length) return;
    const c = getCtx(); const t = c.currentTime;
    _droneGain = c.createGain();
    _droneGain.gain.setValueAtTime(0, t);
    _droneGain.gain.linearRampToValueAtTime(0.06, t + 2);

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.3;
    _droneGain.connect(lp); lp.connect(getDest());

    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.08;
    lfoG.gain.value = 80;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);
    lfo.start(t);
    _droneOscs.push(lfo);

    const freqs = [55, 82.4, 110, 165];
    const detunes = [0, 3, -3, 5, -5];
    freqs.forEach(f => {
      detunes.forEach(d => {
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, t);
        o.detune.setValueAtTime(d, t);
        g.gain.setValueAtTime(d === 0 ? 0.25 : 0.08, t);
        o.connect(g); g.connect(_droneGain!);
        o.start(t);
        _droneOscs.push(o);
      });
    });
  } catch { /* noop */ }
}

function droneStop() {
  if (!_droneGain || !_droneOscs.length) return;
  try {
    const c = getCtx(); const t = c.currentTime;
    _droneGain.gain.linearRampToValueAtTime(0, t + 1.5);
    const oscs = _droneOscs;
    setTimeout(() => { oscs.forEach(o => { try { o.stop(); } catch { /* noop */ } }); }, 2000);
  } catch { /* noop */ }
  _droneOscs = [];
  _droneGain = null;
}

export const SFX = {
  keystroke,
  blipReady,
  blipSet,
  blipGo,
  scoreTick,
  scoreLand,
  submit,
  hover,
  click,
  clickClose,
  hardOn,
  hardOff,
  droneStart,
  droneStop,
  tone,
};
