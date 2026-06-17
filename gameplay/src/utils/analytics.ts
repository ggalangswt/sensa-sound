import { trackEvent } from './gtag';

export const analytics = (() => {
  let gamesPlayed = 0;
  try { gamesPlayed = parseInt(localStorage.getItem('sound_games_played') || '0', 10) || 0; } catch { /* noop */ }

  function incrementGames() {
    gamesPlayed++;
    try { localStorage.setItem('sound_games_played', String(gamesPlayed)); } catch { /* noop */ }
  }

  function log(event: string, data?: Record<string, unknown>) {
    trackEvent(event, data);
  }

  return {
    log,
    get gamesPlayed() { return gamesPlayed; },
    incrementGames,
  };
})();
