// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title SensaSoundGameUpgradeable
/// @notice Upgradeable Sensa Sound settlement contract based on Nadient's stake, resolve, refund, and vault flow.
/// @dev Gameplay and scoring stay backend-authoritative. This contract protects funds and verifies signed results.
contract SensaSoundGameUpgradeable is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    using MessageHashUtils for bytes32;

    enum Mode {
        SOLO,
        DUEL,
        ROYALE
    }

    enum Tier {
        LOSE,
        BEP,
        GOOD,
        GREAT,
        JACKPOT
    }

    IERC20 public token;
    address public signer;
    address public devTreasury;
    address public backendSigner;
    bool public paused;
    uint256 public soloReserveBalance;
    uint256 public totalDevRakeAccumulated;

    uint256 public constant MAX_PLAYERS_PER_ROUND = 5;
    uint256 public constant MIN_STAKE = 1 * 1e6;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    mapping(address => uint256) public balances;
    mapping(bytes32 => mapping(address => uint256)) public stakes;
    mapping(bytes32 => uint256) public roundStakes;
    mapping(bytes32 => address[]) public roundPlayers;
    mapping(bytes32 => bool) public roundResolved;
    mapping(bytes32 => bool) public roundRefunded;
    uint256 private _reentrancyStatus;

    event StakeDeposited(bytes32 indexed roundId, address indexed player, uint256 amount, Mode mode);
    event RoundResolved(bytes32 indexed roundId, address indexed winner, uint256 score, Tier tier, uint256 reward);
    event Withdrawn(address indexed user, uint256 amount);
    event Refunded(bytes32 indexed roundId, address indexed player, uint256 amount);
    event SignerUpdated(address indexed newSigner);
    event BackendSignerUpdated(address indexed newBackendSigner);
    event DevTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury, uint256 migratedBalance);
    event PauseToggled(bool paused);
    event SoloReserveFunded(uint256 amount);
    event SoloReserveDrained(address indexed to, uint256 amount);
    event DevTreasuryFunded(uint256 amount);

    error GamePaused();
    error InvalidSignature();
    error RoundAlreadyResolved();
    error RoundAlreadyRefunded();
    error ArrayLengthMismatch();
    error AlreadyStaked();
    error ZeroAmount();
    error OnlyBackend();
    error InsufficientReserve();
    error NothingToWithdraw();
    error DeadlineExpired();
    error PayoutExceedsStakes();
    error RoundFull();
    error ZeroAddress();
    error StakeTooLow();
    error IncorrectStakeAmount();
    error InvalidWinner();
    error TokenTransferMismatch();

    modifier notPaused() {
        if (paused) revert GamePaused();
        _;
    }

    modifier onlyBackend() {
        if (msg.sender != backendSigner) revert OnlyBackend();
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address tokenAddress,
        address signerAddress,
        address treasuryAddress,
        address backendAddress,
        address ownerAddress
    ) external initializer {
        if (
            tokenAddress == address(0) || signerAddress == address(0) || treasuryAddress == address(0)
                || backendAddress == address(0) || ownerAddress == address(0)
        ) {
            revert ZeroAddress();
        }

        __Ownable_init(ownerAddress);

        token = IERC20(tokenAddress);
        signer = signerAddress;
        devTreasury = treasuryAddress;
        backendSigner = backendAddress;
        _reentrancyStatus = _NOT_ENTERED;
    }

    function depositStake(bytes32 roundId, Mode mode, uint256 amount) external notPaused nonReentrant {
        if (roundResolved[roundId]) revert RoundAlreadyResolved();
        if (roundRefunded[roundId]) revert RoundAlreadyRefunded();
        if (stakes[roundId][msg.sender] != 0) revert AlreadyStaked();
        if (roundPlayers[roundId].length >= MAX_PLAYERS_PER_ROUND) revert RoundFull();
        if (amount < MIN_STAKE) revert StakeTooLow();

        uint256 expectedStake = roundStakes[roundId];
        if (expectedStake == 0) {
            roundStakes[roundId] = amount;
        } else if (expectedStake != amount) {
            revert IncorrectStakeAmount();
        }

        stakes[roundId][msg.sender] = amount;
        roundPlayers[roundId].push(msg.sender);

        _pullExactTokens(msg.sender, amount);
        emit StakeDeposited(roundId, msg.sender, amount, mode);
    }

    function resolveRound(
        bytes32 roundId,
        address[] calldata winners,
        uint256[] calldata rewards,
        Tier[] calldata tiers,
        uint256[] calldata scores,
        uint256 devRake,
        uint256 soloRake,
        bool drainSoloReserve,
        uint256 deadline,
        bytes calldata sig
    ) external notPaused nonReentrant onlyBackend {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (roundResolved[roundId]) revert RoundAlreadyResolved();
        if (roundRefunded[roundId]) revert RoundAlreadyRefunded();
        if (winners.length != rewards.length || winners.length != tiers.length || winners.length != scores.length) {
            revert ArrayLengthMismatch();
        }

        bytes32 hash = keccak256(
            abi.encode(
                roundId,
                winners,
                rewards,
                tiers,
                scores,
                devRake,
                soloRake,
                drainSoloReserve,
                deadline,
                address(this),
                block.chainid
            )
        );
        _verify(hash, sig);

        roundResolved[roundId] = true;

        uint256 totalRewards;
        for (uint256 i = 0; i < rewards.length;) {
            totalRewards += rewards[i];
            unchecked {
                ++i;
            }
        }

        uint256 totalStaked;
        address[] memory players = roundPlayers[roundId];
        for (uint256 i = 0; i < players.length;) {
            totalStaked += stakes[roundId][players[i]];
            unchecked {
                ++i;
            }
        }
        _validateWinners(winners, players);

        if (drainSoloReserve) {
            if (totalRewards > soloReserveBalance) revert InsufficientReserve();
            if (devRake + soloRake > totalStaked) revert PayoutExceedsStakes();
            soloReserveBalance -= totalRewards;
        } else if (totalRewards + devRake + soloRake > totalStaked) {
            revert PayoutExceedsStakes();
        }

        for (uint256 i = 0; i < winners.length;) {
            if (rewards[i] > 0) {
                balances[winners[i]] += rewards[i];
            }
            emit RoundResolved(roundId, winners[i], scores[i], tiers[i], rewards[i]);
            unchecked {
                ++i;
            }
        }

        if (devRake > 0) {
            totalDevRakeAccumulated += devRake;
            balances[devTreasury] += devRake;
            emit DevTreasuryFunded(devRake);
        }
        if (soloRake > 0) {
            soloReserveBalance += soloRake;
            emit SoloReserveFunded(soloRake);
        }
    }

    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        balances[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function refundStake(bytes32 roundId) external onlyBackend nonReentrant {
        if (roundResolved[roundId]) revert RoundAlreadyResolved();
        if (roundRefunded[roundId]) revert RoundAlreadyRefunded();
        roundRefunded[roundId] = true;

        address[] memory players = roundPlayers[roundId];
        for (uint256 i = 0; i < players.length;) {
            address player = players[i];
            uint256 amount = stakes[roundId][player];
            if (amount > 0) {
                stakes[roundId][player] = 0;
                balances[player] += amount;
                emit Refunded(roundId, player, amount);
            }
            unchecked {
                ++i;
            }
        }
    }

    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        signer = newSigner;
        emit SignerUpdated(newSigner);
    }

    function setBackendSigner(address newBackendSigner) external onlyOwner {
        if (newBackendSigner == address(0)) revert ZeroAddress();
        backendSigner = newBackendSigner;
        emit BackendSignerUpdated(newBackendSigner);
    }

    function setDevTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        uint256 oldBalance = balances[devTreasury];
        if (oldBalance > 0) {
            balances[devTreasury] = 0;
            balances[newTreasury] += oldBalance;
        }
        emit DevTreasuryUpdated(devTreasury, newTreasury, oldBalance);
        devTreasury = newTreasury;
    }

    function setPaused(bool newPaused) external onlyOwner {
        paused = newPaused;
        emit PauseToggled(newPaused);
    }

    function seedSoloReserve(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        soloReserveBalance += amount;
        _pullExactTokens(msg.sender, amount);
        emit SoloReserveFunded(amount);
    }

    function emergencyDrainReserve(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = soloReserveBalance;
        if (amount == 0) revert ZeroAmount();
        soloReserveBalance = 0;
        token.safeTransfer(to, amount);
        emit SoloReserveDrained(to, amount);
    }

    function getRoundPlayers(bytes32 roundId) external view returns (address[] memory) {
        return roundPlayers[roundId];
    }

    function _verify(bytes32 hash, bytes calldata sig) internal view {
        bytes32 ethHash = hash.toEthSignedMessageHash();
        address recovered = ECDSA.recover(ethHash, sig);
        if (recovered != signer) revert InvalidSignature();
    }

    function _pullExactTokens(address from, uint256 amount) internal {
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        if (token.balanceOf(address(this)) != balanceBefore + amount) revert TokenTransferMismatch();
    }

    function _validateWinners(address[] calldata winners, address[] memory players) internal pure {
        if (winners.length > players.length) revert InvalidWinner();

        for (uint256 i = 0; i < winners.length;) {
            address winner = winners[i];
            if (winner == address(0)) revert InvalidWinner();

            bool isPlayer;
            for (uint256 j = 0; j < players.length;) {
                if (winner == players[j]) {
                    isPlayer = true;
                    break;
                }
                unchecked {
                    ++j;
                }
            }
            if (!isPlayer) revert InvalidWinner();

            for (uint256 j = 0; j < i;) {
                if (winner == winners[j]) revert InvalidWinner();
                unchecked {
                    ++j;
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
