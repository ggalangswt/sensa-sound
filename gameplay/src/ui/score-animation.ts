import { SFX } from '../audio/sfx';

export function animateScoreClimb(
  container: HTMLElement, targetValue: number,
  durationMs: number, onDone?: () => void
) {
  const intEl = container.querySelector('.score-int') as HTMLElement;
  const decEl = container.querySelector('.score-dec') as HTMLElement;
  const totalHundredths = Math.round(targetValue * 100);

  if (totalHundredths <= 0) {
    intEl.textContent = '0'; decEl.textContent = '00';
    if (onDone) onDone();
    return;
  }

  intEl.textContent = '0'; decEl.textContent = '00';

  let lastHundredths = 0, lastInt = 0, lastStepTime = 0, lastSoundTime = 0;
  const start = performance.now();

  function frame(now: number) {
    const elapsed = now - start;
    const rawP = Math.min(1, elapsed / durationMs);
    const p = 1 - Math.pow(1 - rawP, 5);
    const currentHundredths = Math.min(totalHundredths, Math.round(p * totalHundredths));

    if (currentHundredths !== lastHundredths) {
      const newInt = Math.floor(currentHundredths / 100);
      const newDec = currentHundredths % 100;
      const gap = now - lastStepTime;
      const slow = gap > 70;

      const isIntChange = newInt !== lastInt;
      if (isIntChange) {
        if (slow) { intEl.classList.remove('num-in-fast'); void intEl.offsetWidth; intEl.classList.add('num-in-fast'); }
        intEl.textContent = String(newInt);
        lastInt = newInt;
      }

      if (slow) { decEl.classList.remove('num-in-fast'); void decEl.offsetWidth; decEl.classList.add('num-in-fast'); }
      decEl.textContent = String(newDec).padStart(2, '0');

      if (now - lastSoundTime > 50 && currentHundredths % 10 < 5) {
        SFX.scoreTick(currentHundredths / totalHundredths, isIntChange);
        lastSoundTime = now;
      }

      lastHundredths = currentHundredths;
      lastStepTime = now;
    }

    if (rawP < 1) {
      requestAnimationFrame(frame);
    } else {
      setTimeout(() => {
        intEl.classList.remove('num-in-fast', 'num-out', 'num-in');
        decEl.classList.remove('num-in-fast', 'num-out', 'num-in');
        const finalInt = Math.floor(targetValue);
        const finalDec = Math.round((targetValue % 1) * 100);
        intEl.textContent = String(finalInt);
        decEl.textContent = String(finalDec).padStart(2, '0');
        SFX.scoreLand();
        if (onDone) setTimeout(onDone, 200);
      }, 60);
    }
  }
  requestAnimationFrame(frame);
}
