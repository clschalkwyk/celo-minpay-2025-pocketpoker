import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying PocketPokerEscrow with:', deployer.address)

  const Escrow = await ethers.getContractFactory('PocketPokerEscrow')
  const escrow = await Escrow.deploy()
  await escrow.waitForDeployment()

  console.log('PocketPokerEscrow deployed to:', await escrow.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
