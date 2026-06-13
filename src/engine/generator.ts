import type { Difficulty, RoundSeed } from "@sensa/shared";

import { SOUND_DEFAULTS } from "../constants/game";
import { seededUnit } from "./random";

function difficultyRange(difficulty: Difficulty): readonly [number, number] {
  return difficulty === "hard"
    ? SOUND_DEFAULTS.hardFrequencyRange
    : SOUND_DEFAULTS.easyFrequencyRange;
}

function snapFrequency(value: number): number {
  return Math.round(value / 5) * 5;
}

export function generateSoundRounds(
  seed: string,
  difficulty: Difficulty
): RoundSeed[] {
  const [minHz, maxHz] = difficultyRange(difficulty);
  const span = maxHz - minHz;

  return Array.from({ length: SOUND_DEFAULTS.rounds }, (_, index) => {
    const round = index + 1;
    const targetHz = snapFrequency(
      minHz + seededUnit(seed, `target:${round}`) * span
    );
    const offsetA = 20 + Math.round(seededUnit(seed, `offsetA:${round}`) * 80);
    const offsetB = 25 + Math.round(seededUnit(seed, `offsetB:${round}`) * 110);

    const options = [targetHz, targetHz - offsetA, targetHz + offsetB]
      .map((value) => Math.min(maxHz, Math.max(minHz, snapFrequency(value))))
      .sort((left, right) => left - right);

    return {
      round,
      promptLabel: `Round ${round}`,
      frequencyHz: targetHz,
      optionsHz: [...new Set(options)]
    };
  });
}
