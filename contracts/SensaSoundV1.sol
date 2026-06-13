// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract SensaSoundV1 {
    IERC20 public immutable stablecoin;
    address public immutable settlementSigner;
    address public immutable feeTreasury;

    mapping(bytes32 => bool) public settledRooms;
    mapping(bytes32 => bool) public refundedRooms;
    mapping(address => uint256) public vaultBalances;

    error InvalidSignature();
    error RoomAlreadyFinalized();
    error InvalidPayout();
    error NothingToWithdraw();

    event StakeLocked(bytes32 indexed roomId, address indexed player, uint256 amount);
    event RoomSettled(bytes32 indexed roomId, uint256 feeAmount);
    event RoomRefunded(bytes32 indexed roomId, uint256 refundAmount);
    event Withdrawal(address indexed player, uint256 amount);

    constructor(address stablecoinAddress, address signerAddress, address treasuryAddress) {
        stablecoin = IERC20(stablecoinAddress);
        settlementSigner = signerAddress;
        feeTreasury = treasuryAddress;
    }

    function lockStake(bytes32 roomId, address player, uint256 amount) external {
        stablecoin.transferFrom(player, address(this), amount);
        emit StakeLocked(roomId, player, amount);
    }

    function settleRoom(
        bytes32 roomId,
        address[] calldata winners,
        uint256[] calldata payouts,
        uint256 feeAmount,
        bytes calldata signature
    ) external {
        if (settledRooms[roomId] || refundedRooms[roomId]) revert RoomAlreadyFinalized();
        if (winners.length != payouts.length) revert InvalidPayout();
        if (signature.length == 0) revert InvalidSignature();

        uint256 totalPayout = feeAmount;
        for (uint256 i = 0; i < winners.length; i++) {
            totalPayout += payouts[i];
            vaultBalances[winners[i]] += payouts[i];
        }

        settledRooms[roomId] = true;
        vaultBalances[feeTreasury] += feeAmount;
        emit RoomSettled(roomId, totalPayout);
    }

    function refundRoom(
        bytes32 roomId,
        address[] calldata players,
        uint256 amount,
        bytes calldata signature
    ) external {
        if (settledRooms[roomId] || refundedRooms[roomId]) revert RoomAlreadyFinalized();
        if (signature.length == 0) revert InvalidSignature();

        refundedRooms[roomId] = true;
        for (uint256 i = 0; i < players.length; i++) {
            vaultBalances[players[i]] += amount;
        }
        emit RoomRefunded(roomId, amount);
    }

    function withdraw() external {
        uint256 balance = vaultBalances[msg.sender];
        if (balance == 0) revert NothingToWithdraw();

        vaultBalances[msg.sender] = 0;
        stablecoin.transfer(msg.sender, balance);
        emit Withdrawal(msg.sender, balance);
    }
}
