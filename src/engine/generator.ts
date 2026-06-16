import type { GeneratedRound, SoundDifficulty, SoundGameplayConfig, SoundGameplayRound, SoundOctaveShift } from "../types";

import { SOUND_DEFAULTS } from "../constants/game";
import { seededUnit } from "./random";
import { effectiveTargetFrequency, maxFreq, minFreq } from "./tone";

export function generateSoundRounds(
  seed: string,
  difficulty: SoundDifficulty,
  octaveShift: SoundOctaveShift = 0,
): SoundGameplayRound[] {
  const loBase = 0.1;
  const hiBase = 0.9;
  const lo =
    octaveShift === -1
      ? Math.max(loBase, Math.log((minFreq(difficulty) * 2) / minFreq(difficulty)) / Math.log(maxFreq(difficulty) / minFreq(difficulty)))
      : loBase;
  const hi =
    octaveShift === 1
      ? Math.min(hiBase, Math.log((maxFreq(difficulty) / 2) / minFreq(difficulty)) / Math.log(maxFreq(difficulty) / minFreq(difficulty)))
      : hiBase;

  return Array.from({ length: SOUND_DEFAULTS.rounds }, (_, index) => {
    const round = index + 1;
    const targetNorm = lo + seededUnit(seed, `target:${round}`) * (hi - lo);

    return {
      round,
      promptLabel: `Round ${round}`,
      targetNorm,
      targetHz: Number(
        effectiveTargetFrequency(targetNorm, difficulty, octaveShift).toFixed(2),
      ),
    };
  });
}

export function buildSoundGameplayConfig(args: {
  matchId: string;
  difficulty: SoundDifficulty;
  octaveShift?: SoundOctaveShift;
  memorizeMs?: number;
  guessSeconds?: number;
}): SoundGameplayConfig {
  const octaveShift = args.octaveShift ?? 0;

  return {
    matchId: args.matchId,
    difficulty: args.difficulty,
    octaveShift,
    rounds: generateSoundRounds(args.matchId, args.difficulty, octaveShift),
    memorizeMs: args.memorizeMs ?? (args.difficulty === "hard" ? 1250 : 2500),
    guessSeconds: args.guessSeconds ?? 15,
  };
}

export function toLegacyGeneratedRounds(config: SoundGameplayConfig): GeneratedRound[] {
  return config.rounds.map((round) => ({
    round: round.round,
    targetHz: round.targetHz,
    optionsHz: [round.targetHz],
    promptLabel: round.promptLabel,
  }));
}
