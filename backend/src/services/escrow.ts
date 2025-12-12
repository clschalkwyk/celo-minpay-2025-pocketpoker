import { ethers } from 'ethers'

const ESCROW_ABI = [
  'function payoutWinner(bytes32 matchId, address winner) external',
]

export class EscrowService {
  private contract?: ethers.Contract
  private wallet?: ethers.Wallet

  constructor() {
    const rpcUrl = process.env.RPC_URL
    const privateKey = process.env.PRIVATE_KEY
    const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS

    console.log(`DEBUG EscrowService Env: RPC_URL='${rpcUrl}' ContractAddress='${contractAddress}' PrivateKeySet=${!!privateKey}`);


    if (privateKey && contractAddress && rpcUrl) {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      this.wallet = new ethers.Wallet(privateKey, provider)
      this.contract = new ethers.Contract(contractAddress, ESCROW_ABI, this.wallet)
    } else {
      console.error('EscrowService: Environment variables not fully set. Payouts will fail.')
    }
  }

  async payoutMatch(matchId: string, winnerAddress: string) {
    if (!this.contract) {
      throw new Error('EscrowService: Contract not initialized (check RPC_URL, PRIVATE_KEY, ESCROW_CONTRACT_ADDRESS)')
    }

    try {
      console.info(`EscrowService: Paying out match ${matchId} to ${winnerAddress}`)
      // Ensure matchId is formatted correctly (it should be 0x... 32 bytes hex string)
      // If it's already a hex string from frontend, we pass it directly.
      const tx = await this.contract.payoutWinner(matchId, winnerAddress)
      console.info(`EscrowService: Transaction sent: ${tx.hash}`)
      const receipt = await tx.wait()
      console.info(`EscrowService: Transaction confirmed: ${receipt.hash}`)
      return receipt.hash
    } catch (err) {
      console.error('EscrowService: Payout failed', err)
      throw err
    }
  }
}

export const escrowService = new EscrowService()
