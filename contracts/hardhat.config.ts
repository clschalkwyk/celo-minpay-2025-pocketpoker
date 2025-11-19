import { type HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import dotenv from 'dotenv'

dotenv.config()

const { PRIVATE_KEY, CELO_ALFAJORES_RPC_URL, CELO_MAINNET_RPC_URL, CELO_SEPOLIA_RPC_URL, LOCAL_RPC_URL } = process.env

const sharedAccounts = PRIVATE_KEY ? [PRIVATE_KEY] : undefined

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: LOCAL_RPC_URL || 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    alfajores: {
      url: CELO_ALFAJORES_RPC_URL || 'https://alfajores-forno.celo-testnet.org',
      accounts: sharedAccounts,
      chainId: 44787,
    },
    celo: {
      url: CELO_MAINNET_RPC_URL || 'https://forno.celo.org',
      accounts: sharedAccounts,
      chainId: 42220,
    },
    celoSepolia: {
      url: CELO_SEPOLIA_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org',
      accounts: sharedAccounts,
      chainId: 11142220,
    },
  },
  etherscan: {
    apiKey: {
      celo: process.env.CELOSCAN_API_KEY || '',
      alfajores: process.env.CELOSCAN_API_KEY || '',
      celoSepolia: process.env.CELOSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'celo',
        chainId: 42220,
        urls: {
          apiURL: 'https://api.celoscan.io/api',
          browserURL: 'https://celoscan.io',
        },
      },
      {
        network: 'alfajores',
        chainId: 44787,
        urls: {
          apiURL: 'https://api-alfajores.celoscan.io/api',
          browserURL: 'https://alfajores.celoscan.io',
        },
      },
      {
        network: 'celoSepolia',
        chainId: 11142220,
        urls: {
          apiURL: 'https://api-celo-sepolia.blockscout.com/api',
          browserURL: 'https://celo-sepolia.blockscout.com',
        },
      },
    ],
  },
}

export default config
