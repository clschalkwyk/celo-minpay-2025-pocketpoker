# GEMINI.md

This file provides a comprehensive overview of the PocketPoker project for Large Language Models (LLMs) to understand the project's structure, technologies, and conventions.

## Project Overview

PocketPoker is a mobile-first, play-to-earn poker game built on the Celo blockchain. It's a full-stack monorepo application consisting of a React frontend, a Node.js backend, and a Solidity smart contract.

*   **Frontend:** A Vite-powered React application using Tailwind CSS for styling. It provides the user interface for the game, including the lobby, matchmaking, gameplay, and profile management. It is located in the `frontend/` directory.

*   **Backend:** A Node.js server using the Fastify framework. It handles game logic, matchmaking, user profiles, and communication with the Celo blockchain. The backend is in the `backend/` directory.

*   **Contracts:** A Hardhat project containing the Solidity smart contract for the escrow of funds during a match. The contract is located in the `contracts/` directory.

The project uses `npm` workspaces to manage the three sub-projects in the monorepo.

## Building and Running

### Prerequisites

*   Node.js 20+
*   npm 10+

### Installation

```bash
# Install dependencies for all workspaces
npm install
```

### Development

To run the full application, you'll need to run the frontend and backend in separate terminals.

**Backend:**

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:4000`.

**Frontend:**

```bash
cd frontend
npm run dev
```

The frontend development server will be available at `http://localhost:5173`.

### Testing

Tests can be run from the root directory or within each workspace.

**Run all tests:**

```bash
npm test
```

**Run frontend tests:**

```bash
npm test --workspace frontend
```

**Run backend tests:**

```bash
npm test --workspace backend
```

**Run frontend end-to-end tests:**

```bash
npm run test:e2e --workspace frontend
```

### Linting

```bash
# Lint all workspaces
npm run lint
```

## Development Conventions

*   **Code Style:** The project uses Prettier for code formatting and ESLint for linting. Run `npm run format` to format the code.
*   **Branching:** (Inferring from typical git workflows) Feature branches should be created from `main`.
*   **Commits:** (Inferring from typical git workflows) Commit messages should be clear and concise.
*   **Pull Requests:** (Inferring from typical git workflows) Pull requests should be reviewed before merging to `main`.
*   **CI/CD:** A GitHub Actions workflow is set up to run linting and testing on every push and pull request.

## Key Files

*   `frontend/src/App.tsx`: The main entry point for the React frontend, defining the application's routes.
*   `backend/src/server.ts`: The main entry point for the Fastify backend, where routes and services are registered.
*   `contracts/contracts/PocketPokerEscrow.sol`: The Solidity smart contract that manages the escrow of funds for matches.
*   `package.json`: Located in the root and each workspace, these files define the project's dependencies and scripts.
*   `README.md`: Provides a high-level overview of the project and instructions for getting started.

This `GEMINI.md` file should provide a solid foundation for any LLM to understand and assist with the PocketPoker project.
