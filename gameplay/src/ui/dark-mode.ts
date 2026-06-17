import { SFX } from '../audio/sfx';

export function initDarkMode() {
  const toggle = document.getElementById('dark-mode-toggle');
  if (!toggle) return;

  let isDark = false;
  let transitioning = false;
  const root = document.documentElement;
  const body = document.body;
  const sunIcon = toggle.querySelector('.icon-sun') as HTMLElement | null;
  const moonIcon = toggle.querySelector('.icon-moon') as HTMLElement | null;

  function swapIcons(outIcon: HTMLElement | null, inIcon: HTMLElement | null) {
    if (outIcon) { outIcon.style.opacity = '0'; outIcon.style.transform = 'scale(0)'; }
    if (inIcon) { inIcon.style.opacity = '1'; inIcon.style.transform = 'scale(1)'; }
  }

  toggle.addEventListener('click', () => {
    if (transitioning) return;
    transitioning = true;
    SFX.clickClose();
    isDark = !isDark;

    if (isDark) {
      body.classList.add('dark-mode');
      root.classList.add('dark-mode');
      swapIcons(sunIcon, moonIcon);
    } else {
      body.classList.remove('dark-mode');
      root.classList.remove('dark-mode');
      swapIcons(moonIcon, sunIcon);
    }

    setTimeout(() => { transitioning = false; }, 500);
  });
}
