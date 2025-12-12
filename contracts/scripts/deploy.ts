import { ethers } from 'hardhat'

async function main() {
  const network = await ethers.provider.getNetwork()
  console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`)

  const [deployer] = await ethers.getSigners()
  console.log('Deploying PocketPokerEscrowCUSD with:', deployer.address)

  // Celo Mainnet USDC Address
  // Using USDC instead of cUSD as per user requirement
  let cUSDAddress = '0x765DE816845861e75A25fCA122bb6898B8B1282a' 

  if (network.chainId === 44787n) {
    console.log('Detected Alfajores Testnet')
    // Alfajores USDC or cUSD? Defaulting to cUSD for testnet if USDC unknown, 
    // but assuming mainnet deployment is the goal.
    cUSDAddress = '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1'.toLowerCase()
  } else if (network.chainId === 31337n) {
     console.log('Detected Localhost/Hardhat - Deploying MockToken')
     const MockToken = await ethers.getContractFactory('MockToken')
     const mockToken = await MockToken.deploy('Mock cUSD', 'mcUSD', ethers.parseEther('1000000'))
     await mockToken.waitForDeployment()
     cUSDAddress = await mockToken.getAddress()
     console.log('Mock cUSD deployed to:', cUSDAddress)
  }

  // Ensure address is checksummed
  cUSDAddress = ethers.getAddress(cUSDAddress)
  console.log('Using Token Address (USDC):', cUSDAddress)

  const Escrow = await ethers.getContractFactory('PocketPokerEscrowCUSD')
  const escrow = await Escrow.deploy(cUSDAddress)
  await escrow.waitForDeployment()

  console.log('PocketPokerEscrowCUSD deployed to:', await escrow.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
