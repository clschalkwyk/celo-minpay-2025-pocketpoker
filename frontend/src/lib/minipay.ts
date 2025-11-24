export type EthereumProvider = {
  isMiniPay?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
}

const numberToHex = (value: number | bigint) => '0x' + BigInt(value).toString(16)

export const getProvider = (): EthereumProvider | undefined =>
  (window as Window & { ethereum?: EthereumProvider }).ethereum

export const detectMiniPay = () => {
  const provider = getProvider()
  if (!provider?.isMiniPay) return undefined
  return provider
}

export const requestAccounts = async (provider: EthereumProvider) => {
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  if (!accounts?.length) throw new Error('No MiniPay accounts found')
  return accounts[0]!
}

export const fetchBalance = async (provider: EthereumProvider, address: string) => {
  const balanceHex = (await provider.request({ method: 'eth_getBalance', params: [address, 'latest'] })) as string
  return Number(BigInt(balanceHex)) / 1e18
}

const normalizeChainId = (chainId: string) => {
  if (chainId.startsWith('0x')) return chainId.toLowerCase()
  const parsed = Number.parseInt(chainId, 10)
  if (Number.isNaN(parsed)) return chainId
  return `0x${parsed.toString(16)}`
}

export const ensureChain = async (provider: EthereumProvider, chainId?: string) => {
  if (!chainId) return
  const current = (await provider.request({ method: 'eth_chainId' })) as string
  const expected = normalizeChainId(chainId)
  if (current.toLowerCase() !== expected) {
    throw new Error(`Switch to chain ${expected} (current ${current})`)
  }
}

const FUND_STAKE_SELECTOR = '929ece6f' // keccak256('fundStake(bytes32)') first 4 bytes

const normalizeBytes32 = (value?: string) => {
  if (!value) return '0'.repeat(64)
  const hex = value.startsWith('0x') ? value.slice(2) : value
  return (hex.length > 64 ? hex.slice(0, 64) : hex.padStart(64, '0')).toLowerCase()
}

export const randomMatchId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

const encodeFundStakeCalldata = (matchId?: string) => {
  const arg = normalizeBytes32(matchId)
  return `0x${FUND_STAKE_SELECTOR}${arg}`
}

export const sendStakeTx = async (params: {
  provider: EthereumProvider
  from: string
  stake: number
  contractAddress: string
  matchId?: string
  gasLimit?: number
  gasPriceWei?: number
}) => {
  const valueWei = BigInt(Math.floor(params.stake * 1e18))
  if (valueWei <= 0) throw new Error('Invalid stake amount (zero value)')
  const data = params.matchId ? encodeFundStakeCalldata(params.matchId) : undefined
  const txParams: Record<string, unknown> = {
    from: params.from,
    to: params.contractAddress,
    value: numberToHex(valueWei),
    ...(data ? { data } : {}),
  }
  const gasLimit = params.gasLimit ?? 300000
  if (gasLimit > 0) {
    txParams.gas = numberToHex(gasLimit)
  }
  const gasPrice = params.gasPriceWei ?? 5_000_000_000 // 5 gwei default to avoid zero gasPrice issues
  txParams.gasPrice = numberToHex(gasPrice)
  const txHash = await params.provider.request({ method: 'eth_sendTransaction', params: [txParams] })
  return txHash as string
}

export const fakeTxHash = () => `0x${crypto.randomUUID?.().replace(/-/g, '') ?? Date.now().toString(16)}`
