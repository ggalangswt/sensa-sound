export const SensaSoundV1Abi = [
  "function lockStake(bytes32 roomId,address player,uint256 amount) external",
  "function settleRoom(bytes32 roomId,address[] winners,uint256[] payouts,uint256 fee,bytes calldata signature) external",
  "function refundRoom(bytes32 roomId,address[] players,uint256 amount,bytes calldata signature) external",
  "function withdraw() external"
] as const;
