import type { GeneratedRound, SoundDifficulty, SoundGameplayConfig, SoundGameplayRound, SoundOctaveShift } from "../types";

import { SOUND_DEFAULTS } from "../constants/game";
import { createSeededRandom, shuffleSeeded } from "./random";
import { effectiveTargetFrequency, maxFreq, minFreq } from "./tone";

export function targetNormRange(
  difficulty: SoundDifficulty,
  octaveShift: SoundOctaveShift,
): readonly [number, number] {
  const loBase = 0.1;
  const hiBase = 0.9;
  const scale = Math.log(maxFreq(difficulty) / minFreq(difficulty));
  const lo =
    octaveShift === -1
      ? Math.max(
          loBase,
          Math.log((minFreq(difficulty) * 2) / minFreq(difficulty)) / scale,
        )
      : loBase;
  const hi =
    octaveShift === 1
      ? Math.min(
          hiBase,
          Math.log((maxFreq(difficulty) / 2) / minFreq(difficulty)) / scale,
        )
      : hiBase;

  return [lo, hi] as const;
}

export function generateSoundRounds(
  seed: string,
  difficulty: SoundDifficulty,
  octaveShift: SoundOctaveShift = 0,
): SoundGameplayRound[] {
  const [lo, hi] = targetNormRange(difficulty, octaveShift);
  const random = createSeededRandom(seed);
  const zoneWidth = (hi - lo) / SOUND_DEFAULTS.rounds;
  const targets = Array.from({ length: SOUND_DEFAULTS.rounds }, (_, zone) => {
    return lo + zoneWidth * (zone + random());
  });

  return shuffleSeeded(targets, random).map((targetNorm, index) => {
    const round = index + 1;

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
