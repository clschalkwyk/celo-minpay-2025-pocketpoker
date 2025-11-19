// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

contract PocketPokerEscrow is Ownable, ReentrancyGuard {
  struct MatchEscrow {
    address playerA;
    address playerB;
    uint256 stake;
    bool playerAFunded;
    bool playerBFunded;
    bool playerAReady;
    bool playerBReady;
    bool resolved;
    address winner;
  }

  struct MatchView {
    address playerA;
    address playerB;
    uint256 stake;
    bool playerAFunded;
    bool playerBFunded;
    bool playerAReady;
    bool playerBReady;
    bool resolved;
    address winner;
  }

  mapping(bytes32 => MatchEscrow) private matchEscrows;

  event StakeFunded(bytes32 indexed matchId, address indexed player, uint256 amount);
  event PlayerReady(bytes32 indexed matchId, address indexed player);
  event MatchResolved(bytes32 indexed matchId, address indexed winner, uint256 payout);

  error InvalidStakeAmount();
  error StakeMismatch();
  error StakeAlreadyFunded();
  error NotParticipant();
  error NotFullyFunded();
  error AlreadyReady();
  error NotReady();
  error MatchAlreadyResolved();
  error InvalidWinner();
  error TransferFailed();

  constructor() Ownable(msg.sender) {}

  function fundStake(bytes32 matchId) external payable nonReentrant {
    if (msg.value == 0) revert InvalidStakeAmount();
    MatchEscrow storage esc = matchEscrows[matchId];

    if (esc.playerA == address(0)) {
      esc.playerA = msg.sender;
      esc.stake = msg.value;
      esc.playerAFunded = true;
    } else if (msg.sender == esc.playerA) {
      if (esc.playerAFunded) revert StakeAlreadyFunded();
      if (msg.value != esc.stake) revert StakeMismatch();
      esc.playerAFunded = true;
    } else if (esc.playerB == address(0)) {
      if (msg.value != esc.stake) revert StakeMismatch();
      esc.playerB = msg.sender;
      esc.playerBFunded = true;
    } else if (msg.sender == esc.playerB) {
      if (esc.playerBFunded) revert StakeAlreadyFunded();
      if (msg.value != esc.stake) revert StakeMismatch();
      esc.playerBFunded = true;
    } else {
      revert NotParticipant();
    }

    emit StakeFunded(matchId, msg.sender, msg.value);
  }

  function markReady(bytes32 matchId) external {
    MatchEscrow storage esc = matchEscrows[matchId];
    bool isPlayerA = msg.sender == esc.playerA;
    bool isPlayerB = msg.sender == esc.playerB;
    if (!isPlayerA && !isPlayerB) revert NotParticipant();

    if (isPlayerA) {
      if (!esc.playerAFunded) revert NotFullyFunded();
      if (esc.playerAReady) revert AlreadyReady();
      esc.playerAReady = true;
    } else {
      if (!esc.playerBFunded) revert NotFullyFunded();
      if (esc.playerBReady) revert AlreadyReady();
      esc.playerBReady = true;
    }

    emit PlayerReady(matchId, msg.sender);
  }

  function payoutWinner(bytes32 matchId, address winner) external onlyOwner nonReentrant {
    MatchEscrow storage esc = matchEscrows[matchId];
    if (esc.resolved) revert MatchAlreadyResolved();
    if (!esc.playerAFunded || !esc.playerBFunded) revert NotFullyFunded();
    if (!esc.playerAReady || !esc.playerBReady) revert NotReady();
    if (winner != esc.playerA && winner != esc.playerB) revert InvalidWinner();

    esc.resolved = true;
    esc.winner = winner;
    uint256 payout = esc.stake * 2;
    esc.stake = 0;

    (bool ok, ) = winner.call{value: payout}('');
    if (!ok) revert TransferFailed();

    emit MatchResolved(matchId, winner, payout);
  }

  function getMatch(bytes32 matchId) external view returns (MatchView memory viewData) {
    MatchEscrow storage esc = matchEscrows[matchId];
    viewData = MatchView({
      playerA: esc.playerA,
      playerB: esc.playerB,
      stake: esc.stake,
      playerAFunded: esc.playerAFunded,
      playerBFunded: esc.playerBFunded,
      playerAReady: esc.playerAReady,
      playerBReady: esc.playerBReady,
      resolved: esc.resolved,
      winner: esc.winner
    });
  }

  function potAmount(bytes32 matchId) external view returns (uint256) {
    MatchEscrow storage esc = matchEscrows[matchId];
    if (!esc.playerAFunded || !esc.playerBFunded || esc.resolved) {
      return 0;
    }
    return esc.stake * 2;
  }

  receive() external payable {
    revert InvalidStakeAmount();
  }
}
