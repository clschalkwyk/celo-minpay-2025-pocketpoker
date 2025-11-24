import { ethers } from 'hardhat'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Quick connectivity test against Celo Sepolia / MiniPay network.
 * Calls fundStake(bytes32) on the deployed PocketPokerEscrow contract with a small test stake.
 */
async function main() {
  const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS || '0x8Adf65484A90Cb691B712484B24B6D52d2cF927c'
  const STAKE_WEI = process.env.TEST_STAKE_WEI ?? ethers.parseEther('0.00005') // ~R5 per UI copy

  const [signer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  const balance = await ethers.provider.getBalance(signer.address)

  console.log('Network:', network)
  console.log('Signer:', signer.address)
  console.log('Balance (wei):', balance.toString())
  console.log('Escrow:', ESCROW_ADDRESS)
  console.log('Stake (wei):', STAKE_WEI.toString())

  if (balance < STAKE_WEI) {
    throw new Error('Insufficient balance for test stake')
  }

  const abi = ['function fundStake(bytes32 matchId) payable']
  const escrow = new ethers.Contract(ESCROW_ADDRESS, abi, signer)

  const matchId = ethers.hexlify(ethers.randomBytes(32))
  console.log('MatchId:', matchId)

  const tx = await escrow.fundStake(matchId, {
    value: STAKE_WEI,
  })
  console.log('Submitted tx:', tx.hash)

  const receipt = await tx.wait()
  console.log('Receipt:', receipt)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
