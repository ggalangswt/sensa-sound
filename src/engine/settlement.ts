import type { SettlementPreview } from "@sensa/shared";

import { SOUND_DEFAULTS } from "../constants/game";

export function buildSettlementPreview(args: {
  roomId: string;
  stakeUsd: number;
  playerScores: Array<{ walletAddress: string; score: number }>;
}): SettlementPreview {
  const sortedScores = [...args.playerScores].sort((left, right) => right.score - left.score);
  const highestScore = sortedScores[0]?.score ?? 0;
  const winners = sortedScores
    .filter((entry) => entry.score === highestScore)
    .map((entry) => entry.walletAddress);
  const grossPrizeUsd = args.stakeUsd * args.playerScores.length;
  const platformFeeUsd =
    Math.round((grossPrizeUsd * SOUND_DEFAULTS.platformFeeBps) / 100) / 10000;
  const netPrizeUsd = Math.max(0, grossPrizeUsd - platformFeeUsd);

  return {
    roomId: args.roomId,
    grossPrizeUsd,
    platformFeeUsd,
    winnerWalletAddresses: winners,
    splitPrizeUsd: winners.length === 0 ? 0 : Number((netPrizeUsd / winners.length).toFixed(2)),
    refund: args.playerScores.length < 2
  };
}
