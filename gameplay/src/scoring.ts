import { freqFromNorm } from './audio/tone';
import { minFreq, maxFreq, octaveShift } from './config';

function _erbRate(f: number): number {
  return 21.4 * Math.log10(0.00437 * f + 1);
}

export function scoreRound(targetNorm: number, pickNorm: number): number {
  let tFreq = freqFromNorm(targetNorm);
  if (octaveShift === 1) tFreq *= 2;
  else if (octaveShift === -1) tFreq /= 2;
  const pFreq = freqFromNorm(pickNorm);
  const tErb = _erbRate(tFreq);
  const pErb = _erbRate(pFreq);
  const maxErb = _erbRate(maxFreq()) - _erbRate(minFreq());
  const dist = Math.abs(tErb - pErb) / maxErb;
  const sharp = Math.exp(-Math.pow(dist / 0.015, 2));
  const gentle = Math.exp(-Math.pow(dist / 0.12, 2));
  const raw = sharp * 4 + gentle * 6;
  return Math.round(raw * 100) / 100;
}

export function getFeedback(score: number): string {
  if (score >= 9.5) return _pick(['Flawless.', 'Superhuman.', 'Insane precision.']);
  if (score >= 8) return _pick(['Sharp ear.', 'Nailed it.', 'Really good.']);
  if (score >= 6) return _pick(['Solid.', 'Not bad.', 'Pretty close.']);
  if (score >= 4) return _pick(['Getting warm.', 'In the zone.', 'Keep going.']);
  if (score >= 2) return _pick(['A bit off.', 'Room to grow.', 'Not quite.']);
  return _pick(['Way off.', 'Yikes.', 'Not even close.']);
}

function _pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const totalDescriptions: [number, number, string[]][] = [
  [49, 50, ['Your ears are illegal.', 'You might actually be a bat.']],
  [47, 49, ['Borderline superhuman.', 'This is absurd precision.']],
  [45, 47, ['You hear things most people miss.', 'Professional-grade ears.']],
  [42, 45, ['Really impressive.', 'Your ears definitely work.']],
  [39, 42, ['Above average, genuinely.', 'Better than most people.']],
  [36, 39, ['Solid performance.', 'Not bad at all.']],
  [33, 36, ['Decent. Human-level.', 'You\'re in the middle of the pack.']],
  [30, 33, ['Average territory.', 'Most people land here.']],
  [27, 30, ['Below average, but salvageable.', 'There\'s hope for you.']],
  [24, 27, ['Your ears are mostly decorative.', 'Not your strongest sense.']],
  [20, 24, ['Did you have the volume on?', 'We\'re concerned.']],
  [15, 20, ['Were you guessing?', 'Random chance would do better.']],
  [10, 15, ['Impressively bad.', 'This takes a special kind of talent.']],
  [0, 10, ['Did you play with your eyes?', 'We\'re speechless.']],
];

export function getTotalDescription(score: number): string {
  for (const [min, max, options] of totalDescriptions) {
    if (score >= min && score < max) return _pick(options);
  }
  return _pick(totalDescriptions[totalDescriptions.length - 1][2]);
}
