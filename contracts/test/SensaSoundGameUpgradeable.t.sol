// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockUSDC} from "./MockUSDC.sol";
import {SensaSoundGameUpgradeable} from "../src/SensaSoundGameUpgradeable.sol";
import {SensaSoundGameV2Mock} from "./SensaSoundGameV2Mock.sol";

contract FeeOnTransferUSDC is MockUSDC {
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && value > 1) {
            super._update(from, address(0), 1);
            super._update(from, to, value - 1);
        } else {
            super._update(from, to, value);
        }
    }
}

contract SensaSoundGameUpgradeableTest is Test {
    using MessageHashUtils for bytes32;

    MockUSDC internal usdc;
    SensaSoundGameUpgradeable internal implementation;
    SensaSoundGameUpgradeable internal game;

    uint256 internal signerPk = 0xA11CE;
    address internal signerAddr;
    address internal owner = address(0x0A11);
    address internal devTreasury = address(0xD5E);
    address internal backend = address(0xB4CE);
    address internal alice = address(0xA1);
    address internal bob = address(0xB0);

    function setUp() public {
        signerAddr = vm.addr(signerPk);
        usdc = new MockUSDC();
        implementation = new SensaSoundGameUpgradeable();

        bytes memory initData = abi.encodeCall(
            SensaSoundGameUpgradeable.initialize,
            (address(usdc), signerAddr, devTreasury, backend, owner)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        game = SensaSoundGameUpgradeable(address(proxy));

        _fundAndApprove(alice, 1_000 * 1e6);
        _fundAndApprove(bob, 1_000 * 1e6);
    }

    function _fundAndApprove(address player, uint256 amount) internal {
        usdc.ownerMint(player, amount);
        vm.prank(player);
        usdc.approve(address(game), type(uint256).max);
    }

    function _sign(
        bytes32 roundId,
        address[] memory winners,
        uint256[] memory rewards,
        SensaSoundGameUpgradeable.Tier[] memory tiers,
        uint256[] memory scores,
        uint256 devRake,
        uint256 soloRake,
        bool drain,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 hash = keccak256(
            abi.encode(
                roundId,
                winners,
                rewards,
                tiers,
                scores,
                devRake,
                soloRake,
                drain,
                deadline,
                address(game),
                block.chainid
            )
        );
        bytes32 ethHash = hash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, ethHash);
        return abi.encodePacked(r, s, v);
    }

    function _oneWinner(address winner, uint256 reward)
        internal
        pure
        returns (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        )
    {
        winners = new address[](1);
        winners[0] = winner;
        rewards = new uint256[](1);
        rewards[0] = reward;
        tiers = new SensaSoundGameUpgradeable.Tier[](1);
        tiers[0] = SensaSoundGameUpgradeable.Tier.WHAT;
        scores = new uint256[](1);
        scores[0] = 9800;
    }

    function _resolve(
        bytes32 roundId,
        address[] memory winners,
        uint256[] memory rewards,
        SensaSoundGameUpgradeable.Tier[] memory tiers,
        uint256[] memory scores,
        uint256 devRake,
        uint256 soloRake,
        bool drain
    ) internal {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(roundId, winners, rewards, tiers, scores, devRake, soloRake, drain, deadline);
        vm.prank(backend);
        game.resolveRound(roundId, winners, rewards, tiers, scores, devRake, soloRake, drain, deadline, sig);
    }

    function testInitializeSetsRolesAndToken() public view {
        assertEq(address(game.token()), address(usdc));
        assertEq(game.signer(), signerAddr);
        assertEq(game.backendSigner(), backend);
        assertEq(game.devTreasury(), devTreasury);
        assertEq(game.owner(), owner);
    }

    function testImplementationCannotBeInitializedDirectly() public {
        vm.expectRevert();
        implementation.initialize(address(usdc), signerAddr, devTreasury, backend, owner);
    }

    function testProxyCannotInitializeTwice() public {
        vm.expectRevert();
        game.initialize(address(usdc), signerAddr, devTreasury, backend, owner);
    }

    function testInitializeRejectsZeroAddress() public {
        SensaSoundGameUpgradeable impl = new SensaSoundGameUpgradeable();
        vm.expectRevert(SensaSoundGameUpgradeable.ZeroAddress.selector);
        new ERC1967Proxy(
            address(impl),
            abi.encodeCall(SensaSoundGameUpgradeable.initialize, (address(0), signerAddr, devTreasury, backend, owner))
        );
    }

    function testDuelFlow() public {
        bytes32 roundId = keccak256("duel-1");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        vm.prank(bob);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(alice, 16 * 1e6);

        _resolve(roundId, winners, rewards, tiers, scores, 2 * 1e6, 2 * 1e6, false);

        assertEq(game.balances(alice), 16 * 1e6);
        assertEq(game.soloReserveBalance(), 2 * 1e6);
        assertEq(game.balances(devTreasury), 2 * 1e6);

        vm.prank(alice);
        game.withdraw();
        assertEq(usdc.balanceOf(alice), 1_000 * 1e6 - 10 * 1e6 + 16 * 1e6);
    }

    function testPlayIncrementsCounter() public {
        vm.prank(alice);
        uint256 first = game.play();

        vm.prank(bob);
        uint256 second = game.play();

        assertEq(first, 1);
        assertEq(second, 2);
        assertEq(game.playCount(), 2);
    }

    function testPlayBlockedWhenPaused() public {
        vm.prank(owner);
        game.setPaused(true);

        vm.prank(alice);
        vm.expectRevert(SensaSoundGameUpgradeable.GamePaused.selector);
        game.play();
    }

    function testTieSplitCreditsMultipleWinners() public {
        bytes32 roundId = keccak256("tie-split");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        vm.prank(bob);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        address[] memory winners = new address[](2);
        winners[0] = alice;
        winners[1] = bob;
        uint256[] memory rewards = new uint256[](2);
        rewards[0] = 8 * 1e6;
        rewards[1] = 8 * 1e6;
        SensaSoundGameUpgradeable.Tier[] memory tiers = new SensaSoundGameUpgradeable.Tier[](2);
        tiers[0] = SensaSoundGameUpgradeable.Tier.GREAT;
        tiers[1] = SensaSoundGameUpgradeable.Tier.GREAT;
        uint256[] memory scores = new uint256[](2);
        scores[0] = 9300;
        scores[1] = 9300;

        _resolve(roundId, winners, rewards, tiers, scores, 2 * 1e6, 2 * 1e6, false);

        assertEq(game.balances(alice), 8 * 1e6);
        assertEq(game.balances(bob), 8 * 1e6);
        assertEq(game.balances(devTreasury), 2 * 1e6);
        assertEq(game.soloReserveBalance(), 2 * 1e6);
    }

    function testInvalidSignatureReverts() public {
        bytes32 roundId = keccak256("duel-2");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(alice, 10 * 1e6);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 hash = keccak256(
            abi.encode(roundId, winners, rewards, tiers, scores, uint256(0), uint256(0), false, deadline, address(game), block.chainid)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBADBAD, hash.toEthSignedMessageHash());
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.prank(backend);
        vm.expectRevert(SensaSoundGameUpgradeable.InvalidSignature.selector);
        game.resolveRound(roundId, winners, rewards, tiers, scores, 0, 0, false, deadline, badSig);
    }

    function testRefund() public {
        bytes32 roundId = keccak256("royale-1");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.ROYALE, 10 * 1e6);
        vm.prank(bob);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.ROYALE, 10 * 1e6);

        vm.prank(backend);
        game.refundStake(roundId);

        assertEq(game.balances(alice), 10 * 1e6);
        assertEq(game.balances(bob), 10 * 1e6);
    }

    function testPauseBlocksDepositAndResolveButWithdrawWorks() public {
        bytes32 roundId = keccak256("paused");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        vm.prank(backend);
        game.refundStake(roundId);

        vm.prank(owner);
        game.setPaused(true);

        vm.prank(bob);
        vm.expectRevert(SensaSoundGameUpgradeable.GamePaused.selector);
        game.depositStake(keccak256("paused-new"), SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        vm.prank(alice);
        game.withdraw();
        assertEq(usdc.balanceOf(alice), 1_000 * 1e6);
    }

    function testDoubleResolveReverts() public {
        bytes32 roundId = keccak256("dup");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(alice, 8 * 1e6);

        _resolve(roundId, winners, rewards, tiers, scores, 1 * 1e6, 1 * 1e6, false);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(roundId, winners, rewards, tiers, scores, 1 * 1e6, 1 * 1e6, false, deadline);

        vm.prank(backend);
        vm.expectRevert(SensaSoundGameUpgradeable.RoundAlreadyResolved.selector);
        game.resolveRound(roundId, winners, rewards, tiers, scores, 1 * 1e6, 1 * 1e6, false, deadline, sig);
    }

    function testRoundFullReverts() public {
        bytes32 roundId = keccak256("full-round");
        for (uint256 i = 1; i <= 5; i++) {
            address player = address(uint160(0xF000 + i));
            _fundAndApprove(player, 100 * 1e6);
            vm.prank(player);
            game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.ROYALE, 10 * 1e6);
        }

        address extraPlayer = address(uint160(0xF0FF));
        _fundAndApprove(extraPlayer, 100 * 1e6);
        vm.prank(extraPlayer);
        vm.expectRevert(SensaSoundGameUpgradeable.RoundFull.selector);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.ROYALE, 10 * 1e6);
    }

    function testPayoutExceedsStakesReverts() public {
        bytes32 roundId = keccak256("overpay");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        vm.prank(bob);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(alice, 20 * 1e6);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(roundId, winners, rewards, tiers, scores, 3 * 1e6, 2 * 1e6, false, deadline);
        vm.prank(backend);
        vm.expectRevert(SensaSoundGameUpgradeable.PayoutExceedsStakes.selector);
        game.resolveRound(roundId, winners, rewards, tiers, scores, 3 * 1e6, 2 * 1e6, false, deadline, sig);
    }

    function testAdminRotationAndTreasuryMigration() public {
        bytes32 roundId = keccak256("migrate-test");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        vm.prank(bob);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(alice, 16 * 1e6);

        _resolve(roundId, winners, rewards, tiers, scores, 2 * 1e6, 2 * 1e6, false);

        address newTreasury = address(0xABCD);
        address newBackend = address(0xBEEF);
        address newSigner = address(0xCAFE);
        vm.startPrank(owner);
        game.setDevTreasury(newTreasury);
        game.setBackendSigner(newBackend);
        game.setSigner(newSigner);
        vm.stopPrank();

        assertEq(game.balances(devTreasury), 0);
        assertEq(game.balances(newTreasury), 2 * 1e6);
        assertEq(game.devTreasury(), newTreasury);
        assertEq(game.backendSigner(), newBackend);
        assertEq(game.signer(), newSigner);
    }

    function testNonOwnerAdminCallsRevert() public {
        vm.prank(alice);
        vm.expectRevert();
        game.setSigner(address(0xCAFE));
    }

    function testZeroAddressAdminUpdatesRevert() public {
        vm.startPrank(owner);
        vm.expectRevert(SensaSoundGameUpgradeable.ZeroAddress.selector);
        game.setSigner(address(0));
        vm.expectRevert(SensaSoundGameUpgradeable.ZeroAddress.selector);
        game.setBackendSigner(address(0));
        vm.expectRevert(SensaSoundGameUpgradeable.ZeroAddress.selector);
        game.setDevTreasury(address(0));
        vm.stopPrank();
    }

    function testSoloModeJackpotWin() public {
        usdc.ownerMint(owner, 100 * 1e6);
        vm.startPrank(owner);
        usdc.approve(address(game), type(uint256).max);
        game.seedSoloReserve(100 * 1e6);
        vm.stopPrank();

        bytes32 roundId = keccak256("solo-1");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.SOLO, 5 * 1e6);

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(alice, 10 * 1e6);

        _resolve(roundId, winners, rewards, tiers, scores, 0, 5 * 1e6, true);

        assertEq(game.soloReserveBalance(), 95 * 1e6);
        assertEq(game.balances(alice), 10 * 1e6);
    }

    function testSoloModeLoseAndNoWinners() public {
        usdc.ownerMint(owner, 50 * 1e6);
        vm.startPrank(owner);
        usdc.approve(address(game), type(uint256).max);
        game.seedSoloReserve(50 * 1e6);
        vm.stopPrank();

        bytes32 roundId = keccak256("all-lose");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.SOLO, 5 * 1e6);

        address[] memory winners = new address[](0);
        uint256[] memory rewards = new uint256[](0);
        SensaSoundGameUpgradeable.Tier[] memory tiers = new SensaSoundGameUpgradeable.Tier[](0);
        uint256[] memory scores = new uint256[](0);

        _resolve(roundId, winners, rewards, tiers, scores, 0, 5 * 1e6, true);

        assertEq(game.soloReserveBalance(), 55 * 1e6);
        assertEq(game.balances(alice), 0);
        assertTrue(game.roundResolved(roundId));
    }

    function testBattleRoyaleFlow() public {
        bytes32 roundId = keccak256("royale-full");
        address[5] memory players;
        for (uint256 i = 0; i < 5; i++) {
            players[i] = address(uint160(0xBB00 + i));
            _fundAndApprove(players[i], 100 * 1e6);
            vm.prank(players[i]);
            game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.ROYALE, 10 * 1e6);
        }

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(players[0], 40 * 1e6);

        _resolve(roundId, winners, rewards, tiers, scores, 5 * 1e6, 5 * 1e6, false);

        assertEq(game.balances(players[0]), 40 * 1e6);
        assertEq(game.balances(devTreasury), 5 * 1e6);
        assertEq(game.soloReserveBalance(), 5 * 1e6);
    }

    function testDepositGuards() public {
        bytes32 roundId = keccak256("guard");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        vm.prank(alice);
        vm.expectRevert(SensaSoundGameUpgradeable.AlreadyStaked.selector);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        vm.prank(bob);
        vm.expectRevert(SensaSoundGameUpgradeable.IncorrectStakeAmount.selector);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 5 * 1e6);

        vm.prank(bob);
        vm.expectRevert(SensaSoundGameUpgradeable.StakeTooLow.selector);
        game.depositStake(keccak256("too-low"), SensaSoundGameUpgradeable.Mode.DUEL, 1e6 - 1);
    }

    function testDepositToResolvedOrRefundedRoundReverts() public {
        bytes32 resolvedRound = keccak256("resolved-deposit");
        vm.prank(alice);
        game.depositStake(resolvedRound, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(alice, 8 * 1e6);
        _resolve(resolvedRound, winners, rewards, tiers, scores, 1 * 1e6, 1 * 1e6, false);

        vm.prank(bob);
        vm.expectRevert(SensaSoundGameUpgradeable.RoundAlreadyResolved.selector);
        game.depositStake(resolvedRound, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        bytes32 refundedRound = keccak256("refunded-deposit");
        vm.prank(alice);
        game.depositStake(refundedRound, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        vm.prank(backend);
        game.refundStake(refundedRound);

        vm.prank(bob);
        vm.expectRevert(SensaSoundGameUpgradeable.RoundAlreadyRefunded.selector);
        game.depositStake(refundedRound, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
    }

    function testDeadlineAndAccessControlReverts() public {
        vm.warp(1000);
        bytes32 roundId = keccak256("expired");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(alice, 8 * 1e6);

        uint256 deadline = 2000;
        bytes memory sig = _sign(roundId, winners, rewards, tiers, scores, 1 * 1e6, 1 * 1e6, false, deadline);
        vm.warp(3000);

        vm.prank(backend);
        vm.expectRevert(SensaSoundGameUpgradeable.DeadlineExpired.selector);
        game.resolveRound(roundId, winners, rewards, tiers, scores, 1 * 1e6, 1 * 1e6, false, deadline, sig);

        vm.prank(alice);
        vm.expectRevert(SensaSoundGameUpgradeable.OnlyBackend.selector);
        game.refundStake(roundId);
    }

    function testWinnerValidationReverts() public {
        bytes32 roundId = keccak256("winner-validation");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        vm.prank(bob);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        address[] memory winners = new address[](2);
        winners[0] = alice;
        winners[1] = alice;
        uint256[] memory rewards = new uint256[](2);
        rewards[0] = 8 * 1e6;
        rewards[1] = 8 * 1e6;
        SensaSoundGameUpgradeable.Tier[] memory tiers = new SensaSoundGameUpgradeable.Tier[](2);
        tiers[0] = SensaSoundGameUpgradeable.Tier.GOOD;
        tiers[1] = SensaSoundGameUpgradeable.Tier.GOOD;
        uint256[] memory scores = new uint256[](2);
        scores[0] = 9200;
        scores[1] = 9200;

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(roundId, winners, rewards, tiers, scores, 2 * 1e6, 2 * 1e6, false, deadline);
        vm.prank(backend);
        vm.expectRevert(SensaSoundGameUpgradeable.InvalidWinner.selector);
        game.resolveRound(roundId, winners, rewards, tiers, scores, 2 * 1e6, 2 * 1e6, false, deadline, sig);

        winners[1] = address(0);
        sig = _sign(roundId, winners, rewards, tiers, scores, 2 * 1e6, 2 * 1e6, false, deadline);
        vm.prank(backend);
        vm.expectRevert(SensaSoundGameUpgradeable.InvalidWinner.selector);
        game.resolveRound(roundId, winners, rewards, tiers, scores, 2 * 1e6, 2 * 1e6, false, deadline, sig);
    }

    function testNonPlayerWinnerReverts() public {
        bytes32 roundId = keccak256("non-player-winner");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        (
            address[] memory winners,
            uint256[] memory rewards,
            SensaSoundGameUpgradeable.Tier[] memory tiers,
            uint256[] memory scores
        ) = _oneWinner(bob, 8 * 1e6);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _sign(roundId, winners, rewards, tiers, scores, 1 * 1e6, 1 * 1e6, false, deadline);

        vm.prank(backend);
        vm.expectRevert(SensaSoundGameUpgradeable.InvalidWinner.selector);
        game.resolveRound(roundId, winners, rewards, tiers, scores, 1 * 1e6, 1 * 1e6, false, deadline, sig);
    }

    function testRefundAfterResolveAndDoubleRefundRevert() public {
        bytes32 roundId = keccak256("refund-guards");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
        vm.prank(backend);
        game.refundStake(roundId);

        vm.prank(backend);
        vm.expectRevert(SensaSoundGameUpgradeable.RoundAlreadyRefunded.selector);
        game.refundStake(roundId);
    }

    function testWithdrawEmptyReverts() public {
        vm.prank(alice);
        vm.expectRevert(SensaSoundGameUpgradeable.NothingToWithdraw.selector);
        game.withdraw();
    }

    function testReserveAdminFunctions() public {
        usdc.ownerMint(owner, 50 * 1e6);
        vm.startPrank(owner);
        usdc.approve(address(game), type(uint256).max);
        game.seedSoloReserve(50 * 1e6);
        assertEq(game.soloReserveBalance(), 50 * 1e6);

        vm.expectRevert(SensaSoundGameUpgradeable.ZeroAddress.selector);
        game.emergencyDrainReserve(address(0));

        address recipient = address(0xCAFE);
        game.emergencyDrainReserve(recipient);
        assertEq(game.soloReserveBalance(), 0);
        assertEq(usdc.balanceOf(recipient), 50 * 1e6);

        vm.expectRevert(SensaSoundGameUpgradeable.ZeroAmount.selector);
        game.emergencyDrainReserve(recipient);
        vm.stopPrank();
    }

    function testDepositRejectsFeeOnTransferToken() public {
        FeeOnTransferUSDC feeToken = new FeeOnTransferUSDC();
        SensaSoundGameUpgradeable feeImpl = new SensaSoundGameUpgradeable();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(feeImpl),
            abi.encodeCall(SensaSoundGameUpgradeable.initialize, (address(feeToken), signerAddr, devTreasury, backend, owner))
        );
        SensaSoundGameUpgradeable feeGame = SensaSoundGameUpgradeable(address(proxy));

        feeToken.ownerMint(alice, 100 * 1e6);
        vm.prank(alice);
        feeToken.approve(address(feeGame), type(uint256).max);

        vm.prank(alice);
        vm.expectRevert(SensaSoundGameUpgradeable.TokenTransferMismatch.selector);
        feeGame.depositStake(keccak256("fee-token"), SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);
    }

    function testOwnerCanUpgradeAndStorageSurvives() public {
        bytes32 roundId = keccak256("upgrade-storage");
        vm.prank(alice);
        game.depositStake(roundId, SensaSoundGameUpgradeable.Mode.DUEL, 10 * 1e6);

        SensaSoundGameV2Mock v2 = new SensaSoundGameV2Mock();

        vm.prank(alice);
        vm.expectRevert();
        game.upgradeToAndCall(address(v2), "");

        vm.prank(owner);
        game.upgradeToAndCall(address(v2), "");

        SensaSoundGameV2Mock upgraded = SensaSoundGameV2Mock(address(game));
        assertEq(upgraded.version(), "v2");
        assertEq(upgraded.stakes(roundId, alice), 10 * 1e6);
        assertEq(address(upgraded.token()), address(usdc));
    }
}
