// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol'; // Import IERC20

contract PocketPokerEscrowCUSD is Ownable, ReentrancyGuard {
  struct MatchEscrow {
    address playerA;
    address playerB;
    uint256 stake; // This will now represent stake in cUSD's smallest unit
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
  address public immutable cUSDTokenAddress; // Variable to store cUSD address

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
  error InsufficientTokenAllowance(); // New error for allowance check

  // Constructor now accepts the cUSD token address
  constructor(address _cUSDTokenAddress) Ownable(msg.sender) {
    require(_cUSDTokenAddress != address(0), "Invalid cUSD token address");
    cUSDTokenAddress = _cUSDTokenAddress;
  }

  // Updated function to fund stake with cUSD tokens
  function fundStake(bytes32 matchId, uint256 amount) external nonReentrant {
    if (amount == 0) revert InvalidStakeAmount();

    MatchEscrow storage esc = matchEscrows[matchId];

    // --- REORDERED CHECKS ---
    // First, check if the sender is a registered participant or if a slot is available for them.
    bool isPlayerA = msg.sender == esc.playerA;
    bool isPlayerB = msg.sender == esc.playerB;

    if (esc.playerA == address(0)) { // Player A slot is empty
        if (isPlayerB) revert NotParticipant(); // Player B cannot take Player A's spot
        esc.playerA = msg.sender;
        esc.stake = amount;
        esc.playerAFunded = true;
    } else if (isPlayerA) { // Player A is funding again
        if (esc.playerAFunded) revert StakeAlreadyFunded();
        if (amount != esc.stake) revert StakeMismatch();
        // Allowance and transfer will be checked below
    } else if (esc.playerB == address(0)) { // Player B slot is empty
        if (isPlayerA) revert NotParticipant(); // Player A cannot take Player B's spot
        if (amount != esc.stake) revert StakeMismatch();
        esc.playerB = msg.sender;
        esc.playerBFunded = true;
    } else if (isPlayerB) { // Player B is funding again
        if (esc.playerBFunded) revert StakeAlreadyFunded();
        if (amount != esc.stake) revert StakeMismatch();
        // Allowance and transfer will be checked below
    } else { // Neither player slot is empty, and msg.sender is not playerA or playerB
        revert NotParticipant();
    }
    // --- END REORDERED CHECKS ---

    // Ensure the user has approved the contract to spend this amount of cUSD
    // Check allowance first
    uint256 allowance = IERC20(cUSDTokenAddress).allowance(msg.sender, address(this));
    if (allowance < amount) {
        revert InsufficientTokenAllowance();
    }

    // Transfer cUSD from user to this contract
    bool success = IERC20(cUSDTokenAddress).transferFrom(msg.sender, address(this), amount);
    if (!success) revert TransferFailed();

    // Update funding status if it wasn't set during participant checks above
    // This handles the case where player A or B is funding for the first time.
    if (isPlayerA) esc.playerAFunded = true;
    if (isPlayerB) esc.playerBFunded = true;

    emit StakeFunded(matchId, msg.sender, amount);
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

  // payoutWinner now needs to transfer cUSD back from the contract
  function payoutWinner(bytes32 matchId, address winner) external onlyOwner nonReentrant {
    MatchEscrow storage esc = matchEscrows[matchId];
    if (esc.resolved) revert MatchAlreadyResolved();
    if (!esc.playerAFunded || !esc.playerBFunded) revert NotFullyFunded();
    if (!esc.playerAReady || !esc.playerBReady) revert NotReady();
    if (winner != esc.playerA && winner != esc.playerB) revert InvalidWinner();

    esc.resolved = true;
    esc.winner = winner;
    uint256 payout = esc.stake * 2; // Total pot
    uint256 contractBalance = IERC20(cUSDTokenAddress).balanceOf(address(this));
    
    // Ensure contract has enough cUSD to pay out
    if (contractBalance < payout) revert TransferFailed(); // Or a more specific error if possible

    esc.stake = 0; // Reset stake amount in escrow struct

    // Transfer the cUSD payout to the winner
    bool ok = IERC20(cUSDTokenAddress).transfer(winner, payout);
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

  // Pot amount is now the sum of cUSD stakes held by the contract
  function potAmount(bytes32 matchId) external view returns (uint256) {
    MatchEscrow storage esc = matchEscrows[matchId];
    if (!esc.playerAFunded || !esc.playerBFunded || esc.resolved) {
      return 0;
    }
    return esc.stake * 2;
  }

  // Fallback/receive functions are not needed for token transfers
  // receive() external payable { revert InvalidStakeAmount(); }
}
