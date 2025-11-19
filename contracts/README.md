# PocketPoker Escrow Contract

Hardhat + TypeScript workspace containing the escrow contract that guards MiniPay stakes. The contract is intentionally minimal: it escrows equal stakes from two players, tracks readiness, and lets an operator (backend) release the pot to the winner exactly once.

## Key Commands

```bash
npm install               # install tooling
npm run compile           # hardhat compile + typechain
npm test                  # solidity unit tests via hardhat
npm run deploy:local      # deploy to localhost hardhat node
npm run deploy:alfajores  # deploy to Celo Alfajores (Forno)
npm run deploy:celo       # deploy to Celo Mainnet (only after audits!)
npm run deploy:celo-sepolia # deploy to Celo Sepolia testnet
```

The Hardhat config mirrors the [Celo Composer](https://github.com/celo-org/celo-composer) defaults so all official networks (mainnet, Alfajores, Celo-Sepolia) are available out of the box. Use whichever target matches your MiniPay rollout plan.

## Contract Highlights

- `fundStake(matchId)` – players lock funds (guarded against double deposits and stake mismatch).
- `markReady(matchId)` – once funded, each player signals readiness.
- `payoutWinner(matchId, winner)` – only owner may release the pot to a valid winner after both players are ready.
- Events for funding, readiness, and payout to keep the backend/clients in sync.

## Environment

Copy `.env.example` to `.env` and fill in:

```
CELO_ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_MAINNET_RPC_URL=https://forno.celo.org
CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
PRIVATE_KEY=0x...
CELOSCAN_API_KEY=...
```

`PRIVATE_KEY` should be the backend/operator account allowed to deploy and trigger payouts. You can leave the RPC URLs at their defaults if you are fine using the public Forno endpoints.

## Tests

`test/PocketPokerEscrow.test.ts` covers:
- Funding flow, stake mismatches, and non participant guards.
- Readiness gating.
- Happy-path payout and unauthorized payout attempts.
