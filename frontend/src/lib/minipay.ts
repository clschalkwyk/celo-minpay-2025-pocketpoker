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

export const ensureChain = async (provider: EthereumProvider, chainId?: string) => {
  if (!chainId) return
  const current = await provider.request({ method: 'eth_chainId' })
  if (current !== chainId) {
    throw new Error(`Switch to chain ${chainId}`)
  }
}

export const sendStakeTx = async (params: {
  provider: EthereumProvider
  from: string
  stake: number
  contractAddress: string
}) => {
  const valueWei = BigInt(Math.floor(params.stake * 1e18))
  const txHash = await params.provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: params.from,
        to: params.contractAddress,
        value: numberToHex(valueWei),
      },
    ],
  })
  return txHash as string
}

export const fakeTxHash = () => `0x${crypto.randomUUID?.().replace(/-/g, '') ?? Date.now().toString(16)}`
