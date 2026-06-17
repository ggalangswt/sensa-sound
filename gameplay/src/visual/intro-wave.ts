import { setupCanvas, drawIntroWaveLayer, _waveStart, _dragIntensity, setDragIntensity } from './gradient';

let introWaveRunning = false;

function drawIntroWave() {
  const time = (performance.now() - _waveStart) / 1000;
  const savedDrag = _dragIntensity;
  setDragIntensity(0);

  const bk = setupCanvas(document.getElementById('intro-wave-back') as HTMLCanvasElement);
  if (bk) drawIntroWaveLayer(bk.ctx, bk.w, bk.h, time, 6, 2.0);

  const fr = setupCanvas(document.getElementById('intro-wave-canvas') as HTMLCanvasElement);
  if (fr) drawIntroWaveLayer(fr.ctx, fr.w, fr.h, time, 1.1, 1);

  setDragIntensity(savedDrag);
}

function introWaveLoop() {
  if (!introWaveRunning) return;
  drawIntroWave();
  requestAnimationFrame(introWaveLoop);
}

export function startIntroWave() {
  if (introWaveRunning) return;
  introWaveRunning = true;
  introWaveLoop();
}

export function stopIntroWave() {
  introWaveRunning = false;
}
