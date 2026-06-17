import { SOUND_DEFAULTS } from "../constants/game";
import type { CanonicalScoreBreakdown, SoundGameplayConfig, SoundMatchSubmission } from "../types";
import { buildSoundGameplayConfig } from "./generator";
import { effectiveTargetFrequency, freqFromNorm, maxFreq, minFreq } from "./tone";

function erbRate(frequencyHz: number): number {
  return 21.4 * Math.log10(0.00437 * frequencyHz + 1);
}

export function scoreRound(args: {
  targetNorm: number;
  pickedNorm: number;
  difficulty: "easy" | "hard";
  octaveShift: -1 | 0 | 1;
}): number {
  const targetHz = effectiveTargetFrequency(
    args.targetNorm,
    args.difficulty,
    args.octaveShift,
  );
  const guessedHz = freqFromNorm(args.pickedNorm, args.difficulty);
  const targetErb = erbRate(targetHz);
  const guessedErb = erbRate(guessedHz);
  const maxErb = erbRate(maxFreq(args.difficulty)) - erbRate(minFreq(args.difficulty));
  const distance = Math.abs(targetErb - guessedErb) / maxErb;
  const sharp = Math.exp(-Math.pow(distance / 0.015, 2));
  const gentle = Math.exp(-Math.pow(distance / 0.12, 2));
  const raw = sharp * 4 + gentle * 6;
  return Math.round(raw * 100) / 100;
}

export function scoreSoundSubmission(
  seed: string,
  difficulty: "easy" | "hard",
  submission: SoundMatchSubmission,
  octaveShift: -1 | 0 | 1 = submission.octaveShift,
): CanonicalScoreBreakdown {
  const config = buildSoundGameplayConfig({
    matchId: seed,
    difficulty,
    octaveShift,
  });

  return scoreSoundMatch(config, submission);
}

export function scoreSoundMatch(
  config: SoundGameplayConfig,
  submission: SoundMatchSubmission,
): CanonicalScoreBreakdown {
  const perRound = config.rounds.map((round) => {
    const picked = submission.rounds.find((entry) => entry.round === round.round);
    const pickedNorm = picked?.pickedNorm ?? 0.5;
    const guessedHz = Number(freqFromNorm(pickedNorm, config.difficulty).toFixed(2));
    const score = scoreRound({
      targetNorm: round.targetNorm,
      pickedNorm,
      difficulty: config.difficulty,
      octaveShift: config.octaveShift,
    });

    return {
      round: round.round,
      targetNorm: round.targetNorm,
      pickedNorm,
      score,
      targetHz: round.targetHz,
      guessedHz,
      latencyMs: picked?.latencyMs ?? 0,
    };
  });

  const total = Number(
    Math.min(
      SOUND_DEFAULTS.maxScore,
      Math.max(0, perRound.reduce((sum, round) => sum + round.score, 0)),
    ).toFixed(2),
  );

  return {
    total,
    percent: Number(((total / SOUND_DEFAULTS.maxScore) * 100).toFixed(2)),
    perRound,
  };
}
