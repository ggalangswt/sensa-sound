import { SFX } from '../audio/sfx';

const allScreens = Array.from(document.querySelectorAll<HTMLElement>('.screen'));
let _showId = 0;

export function show(scr: HTMLElement) {
  _showId++;
  allScreens.forEach(s => {
    s.classList.remove('active');
    s.style.zIndex = '';
  });
  scr.classList.add('active');
  scr.style.zIndex = '5';
  scr.scrollTop = 0;
}

export function getShowId(): number {
  return _showId;
}

export function initShimmer(input: HTMLInputElement) {
  const shimmer = input.nextElementSibling as HTMLElement | null;
  if (!shimmer || !shimmer.classList.contains('shimmer-placeholder')) return;

  function update() {
    if (input.value.length > 0 || document.activeElement === input) {
      shimmer!.classList.add('hidden');
    } else {
      shimmer!.classList.remove('hidden');
    }
  }

  input.addEventListener('focus', update);
  input.addEventListener('blur', update);
  input.addEventListener('input', update);
  update();
}

export function initAllShimmers() {
  document.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach(input => {
    initShimmer(input);
    input.addEventListener('input', () => {
      SFX.keystroke();
    });
  });
}
