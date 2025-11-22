const fallbackRate = 100000
const rawRate = Number(import.meta.env.VITE_CELO_ZAR_RATE ?? fallbackRate)

export const CELO_TO_ZAR_RATE = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : fallbackRate

export const convertZarToCelo = (amount: number) => amount / CELO_TO_ZAR_RATE

export const convertCeloToZar = (amount: number) => amount * CELO_TO_ZAR_RATE

export const formatCelo = (amount: number, digits = 6) => amount.toFixed(digits)
