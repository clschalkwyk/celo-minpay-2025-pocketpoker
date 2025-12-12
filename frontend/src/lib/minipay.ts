export type EthereumProvider = {
  isMiniPay?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
}

const numberToHex = (value: number | bigint) => {
  const val = typeof value === 'number' ? Math.floor(value) : value
  return '0x' + BigInt(val).toString(16)
}

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

// Fetches Native CELO Balance
export const fetchNativeBalance = async (provider: EthereumProvider, address: string) => {
  const balanceHex = (await provider.request({ method: 'eth_getBalance', params: [address, 'latest'] })) as string
  if (!balanceHex || balanceHex === '0x') return 0
  return Number(BigInt(balanceHex)) / 1e18
}

// Helpers for ABI Encoding
const padAddress = (address: string) => {
  return address.replace(/^0x/, '').toLowerCase().padStart(64, '0')
}

const padUint256 = (value: bigint | number) => {
  const val = typeof value === 'number' ? Math.floor(value) : value
  return BigInt(val).toString(16).padStart(64, '0')
}

// ERC20 Selectors
const ERC20_BALANCE_OF = '70a08231' // balanceOf(address)
const ERC20_APPROVE = '095ea7b3'    // approve(address,uint256)
const ERC20_ALLOWANCE = 'dd62ed3e'  // allowance(address,address)
const FUND_STAKE_CUSD_SELECTOR = 'd6adc450' // fundStake(bytes32,uint256)

export const fetchCUSDBalance = async (provider: EthereumProvider, tokenAddress: string, walletAddress: string) => {
  const data = `0x${ERC20_BALANCE_OF}${padAddress(walletAddress)}`
  console.log(`Fetching cUSD Balance: token=${tokenAddress} wallet=${walletAddress} data=${data}`)
  const balanceHex = (await provider.request({ 
    method: 'eth_call', 
    params: [{ to: tokenAddress, data, from: walletAddress }, 'latest'] 
  })) as string
  console.log(`cUSD Balance Hex: ${balanceHex}`)
  if (!balanceHex || balanceHex === '0x') return 0
  const balance = Number(BigInt(balanceHex)) / 1e18
  console.log(`cUSD Balance Parsed: ${balance}`)
  return balance
}

export const fetchCUSDAllowance = async (provider: EthereumProvider, tokenAddress: string, owner: string, spender: string) => {
  const data = `0x${ERC20_ALLOWANCE}${padAddress(owner)}${padAddress(spender)}`
  const allowanceHex = (await provider.request({ 
    method: 'eth_call', 
    params: [{ to: tokenAddress, data, from: owner }, 'latest'] 
  })) as string
  if (!allowanceHex || allowanceHex === '0x') return 0
  return Number(BigInt(allowanceHex)) / 1e18
}

export const sendApproveTx = async (params: {
  provider: EthereumProvider
  from: string
  tokenAddress: string
  spender: string
  amount: number
  gasPriceWei?: number
  feeCurrency?: string
}) => {
  const valueWei = BigInt(Math.floor(params.amount * 1e18))
  const data = `0x${ERC20_APPROVE}${padAddress(params.spender)}${padUint256(valueWei)}`
  
  const txParams: Record<string, unknown> = {
    from: params.from,
    to: params.tokenAddress,
    data,
    value: '0x0'
  }

  // Optional Gas Parameters - Let wallet estimate if not provided
  if (params.gasPriceWei) {
    txParams.gasPrice = numberToHex(params.gasPriceWei)
  }
  
  if (params.feeCurrency) {
    txParams.feeCurrency = params.feeCurrency
  }
  
  const txHash = await params.provider.request({ 
    method: 'eth_sendTransaction', 
    params: [txParams] 
  })
  return txHash as string
}

export const waitForReceipt = async (provider: EthereumProvider, txHash: string, timeoutMs = 60000) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [txHash] })
    if (receipt) {
      if ((receipt as { status: string }).status === '0x1') return true
      if ((receipt as { status: string }).status === '0x0') throw new Error('Transaction reverted')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Transaction confirmation timeout')
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

const normalizeBytes32 = (value?: string) => {
  if (!value) return '0'.repeat(64)
  const hex = value.startsWith('0x') ? value.slice(2) : value
  return (hex.length > 64 ? hex.slice(0, 64) : hex.padStart(64, '0')).toLowerCase()
}

export const randomMatchId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

const encodeFundStakeCUSD = (matchId: string, amountWei: bigint) => {
  const arg1 = normalizeBytes32(matchId)
  const arg2 = padUint256(amountWei)
  return `0x${FUND_STAKE_CUSD_SELECTOR}${arg1}${arg2}`
}

// Selector from deployed contract bytecode (markReady(bytes32) in current build)
const MARK_READY_SELECTOR = '89ff3079'
const MARK_READY_LEGACY_SELECTOR = '4c38b70d' // keccak256('markReady()')
const GET_MATCH_SELECTOR = 'fcc6077d' // getMatch(bytes32)

export const encodeMarkReadyData = (matchId: string) => {
  const arg1 = normalizeBytes32(matchId)
  return `0x${MARK_READY_SELECTOR}${arg1}`
}

export const sendMarkReadyTx = async (params: {
  provider: EthereumProvider
  from: string
  contractAddress: string
  matchId: string
  gasLimit?: number
  gasPriceWei?: number
  feeCurrency?: string
}) => {
  const data = encodeMarkReadyData(params.matchId)

  const txParams: Record<string, unknown> = {
    from: params.from,
    to: params.contractAddress,
    data,
    value: '0x0',
  }

  if (params.gasLimit) {
    txParams.gas = numberToHex(params.gasLimit)
  }
  if (params.gasPriceWei) {
    txParams.gasPrice = numberToHex(params.gasPriceWei)
  }
  if (params.feeCurrency) {
    txParams.feeCurrency = params.feeCurrency
  }

  const txHash = await params.provider.request({ method: 'eth_sendTransaction', params: [txParams] })
  return txHash as string
}

export const sendMarkReadyLegacyTx = async (params: {
  provider: EthereumProvider
  from: string
  contractAddress: string
  gasLimit?: number
  gasPriceWei?: number
  feeCurrency?: string
}) => {
  const data = `0x${MARK_READY_LEGACY_SELECTOR}`
  const txParams: Record<string, unknown> = {
    from: params.from,
    to: params.contractAddress,
    data,
    value: '0x0',
  }
  if (params.gasLimit) txParams.gas = numberToHex(params.gasLimit)
  if (params.gasPriceWei) txParams.gasPrice = numberToHex(params.gasPriceWei)
  if (params.feeCurrency) txParams.feeCurrency = params.feeCurrency
  const txHash = await params.provider.request({ method: 'eth_sendTransaction', params: [txParams] })
  return txHash as string
}

export const sendStakeTx = async (params: {
  provider: EthereumProvider
  from: string
  stake: number
  contractAddress: string
  matchId?: string
  gasLimit?: number
  gasPriceWei?: number
  feeCurrency?: string
}) => {
  const valueWei = BigInt(Math.floor(params.stake * 1e18))
  if (valueWei <= 0) throw new Error('Invalid stake amount (zero value)')
  
  // New signature: fundStake(bytes32 matchId, uint256 amount)
  const data = params.matchId ? encodeFundStakeCUSD(params.matchId, valueWei) : undefined
  
  const txParams: Record<string, unknown> = {
    from: params.from,
    to: params.contractAddress,
    value: '0x0', // No native CELO sent
    ...(data ? { data } : {}),
  }
  
  // Optional Gas Parameters - Let wallet estimate if not provided
  if (params.gasLimit) {
    txParams.gas = numberToHex(params.gasLimit)
  }
  if (params.gasPriceWei) {
    txParams.gasPrice = numberToHex(params.gasPriceWei)
  }
  
  if (params.feeCurrency) {
    txParams.feeCurrency = params.feeCurrency
  }

  console.log('Sending Stake Tx Params:', JSON.stringify(txParams, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ))

  const txHash = await params.provider.request({ method: 'eth_sendTransaction', params: [txParams] })
  return txHash as string
}

export const fakeTxHash = () => `0x${crypto.randomUUID?.().replace(/-/g, '') ?? Date.now().toString(16)}`

export const fetchEscrowReadyFlags = async (provider: EthereumProvider, contractAddress: string, matchId: string) => {
  const data = `0x${GET_MATCH_SELECTOR}${normalizeBytes32(matchId)}`
  const raw = (await provider.request({
    method: 'eth_call',
    params: [{ to: contractAddress, data }, 'latest'],
  })) as string
  if (!raw || raw === '0x') return { playerAReady: false, playerBReady: false, raw }
  // ABI layout: [0] playerA, [1] playerB, [2] stake, [3] playerAFunded, [4] playerBFunded, [5] playerAReady, [6] playerBReady, [7] resolved, [8] winner
  const cleaned = raw.replace(/^0x/, '')
  const sliceBool = (idx: number) => {
    const start = idx * 64
    const chunk = cleaned.slice(start, start + 64)
    return chunk?.endsWith('1') ?? false
  }
  return {
    playerAReady: sliceBool(5),
    playerBReady: sliceBool(6),
    raw,
  }
}

export const fetchEscrowStatus = async (provider: EthereumProvider, contractAddress: string, matchId: string) => {
  const data = `0x${GET_MATCH_SELECTOR}${normalizeBytes32(matchId)}`
  const raw = (await provider.request({
    method: 'eth_call',
    params: [{ to: contractAddress, data }, 'latest'],
  })) as string
  const cleaned = raw?.replace(/^0x/, '') ?? ''
  const sliceHex = (idx: number) => cleaned.slice(idx * 64, idx * 64 + 64)
  const toAddress = (chunk: string) => (chunk ? `0x${chunk.slice(24)}` : undefined)
  const toBool = (chunk: string) => chunk?.endsWith('1') ?? false
  const toUint = (chunk: string) => (chunk ? BigInt(`0x${chunk}`) : 0n)
  return {
    raw,
    playerA: toAddress(sliceHex(0)),
    playerB: toAddress(sliceHex(1)),
    stake: toUint(sliceHex(2)),
    playerAFunded: toBool(sliceHex(3)),
    playerBFunded: toBool(sliceHex(4)),
    playerAReady: toBool(sliceHex(5)),
    playerBReady: toBool(sliceHex(6)),
    resolved: toBool(sliceHex(7)),
    winner: toAddress(sliceHex(8)),
  }
}

export const decodeRevertSelector = (data?: string) => {
  if (!data) return undefined
  const selector = data.slice(0, 10).toLowerCase()
  const map: Record<string, string> = {
    '0x9488aaa6': 'NotReady',
    '0xe438f8ce': 'NotParticipant',
    '0x41d1bdff': 'NotFullyFunded',
    '0x040ef8ec': 'InvalidStakeAmount',
    '0x4581e827': 'StakeMismatch',
    '0xe228521d': 'StakeAlreadyFunded',
    '0x2000ee6c': 'AlreadyReady',
    '0x68f68e2a': 'MatchAlreadyResolved',
    '0x93a5f3c7': 'InvalidWinner',
    '0x90b8ec18': 'TransferFailed',
    '0xa085b77b': 'InsufficientTokenAllowance',
  }
  return map[selector] ?? selector
}
