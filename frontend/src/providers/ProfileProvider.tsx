import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { UserProfile } from '../types'
import { Api } from '../lib/api'
import { useMiniPayContext } from './MiniPayProvider'

type ProfileContextValue = {
  profile?: UserProfile
  loading: boolean
  refreshProfile: () => Promise<void>
  applyMatchResult: (result: 'you' | 'opponent') => number
  equipDeck: (deckId: string) => void
  grantXp: (amount: number) => void
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

const calcXpProgress = (profile: UserProfile, delta: number) => {
  let xp = profile.xp + delta
  let level = profile.level
  let xpToNext = profile.xpToNextLevel
  while (xp >= xpToNext) {
    xp -= xpToNext
    level += 1
    xpToNext += 200
  }
  return { xp, level, xpToNextLevel: xpToNext }
}

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile>()
  const [loading, setLoading] = useState(true)
  const { address, status } = useMiniPayContext()

  const refreshProfile = useCallback(async () => {
    if (!address) return
    setLoading(true)
    const data = await Api.initProfile(address)
    setProfile(data.profile)
    setLoading(false)
  }, [address])

  useEffect(() => {
    if (status !== 'ready' || !address) return
    const timer = window.setTimeout(() => {
      void refreshProfile()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [status, address, refreshProfile])

  const grantXp = useCallback((amount: number) => {
    setProfile((prev) => {
      if (!prev) return prev
      const { xp, level, xpToNextLevel } = calcXpProgress(prev, amount)
      return { ...prev, xp, level, xpToNextLevel }
    })
  }, [])

  const applyMatchResult = useCallback((result: 'you' | 'opponent') => {
    let xpAwarded = 0
    setProfile((prev) => {
      if (!prev) return prev
      const win = result === 'you'
      const xpDelta = win ? 180 : 80
      xpAwarded = xpDelta
      const eloDelta = win ? 12 : -8
      const { xp, level, xpToNextLevel } = calcXpProgress(prev, xpDelta)
      return {
        ...prev,
        xp,
        level,
        xpToNextLevel,
        elo: Math.max(800, prev.elo + eloDelta),
        stats: {
          matches: prev.stats.matches + 1,
          wins: prev.stats.wins + (win ? 1 : 0),
          losses: prev.stats.losses + (win ? 0 : 1),
          streak: win ? prev.stats.streak + 1 : 0,
        },
      }
    })
    return xpAwarded
  }, [])

  const equipDeck = useCallback(
    async (deckId: string) => {
      if (!address) return
      const { profile: updatedProfile } = await Api.equipDeck({ walletAddress: address, deckId })
      setProfile(updatedProfile)
    },
    [address],
  )

  const value = useMemo(
    () => ({ profile, loading, refreshProfile, applyMatchResult, equipDeck, grantXp }),
    [profile, loading, refreshProfile, applyMatchResult, equipDeck, grantXp],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProfileContext = () => {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider')
  return ctx
}
