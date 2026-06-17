const _activeAnims: Record<string, () => void> = {};

export function startAnim(key: string, fn: (time: number) => void) {
  stopAnim(key);
  let running = true;
  function loop() {
    if (!running) return;
    fn(performance.now());
    requestAnimationFrame(loop);
  }
  _activeAnims[key] = () => { running = false; };
  requestAnimationFrame(loop);
}

export function stopAnim(key: string) {
  if (_activeAnims[key]) {
    _activeAnims[key]();
    delete _activeAnims[key];
  }
}
