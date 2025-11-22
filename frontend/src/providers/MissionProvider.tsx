import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import type { Mission } from '../types'
import { Api } from '../lib/api'
import { useMiniPayContext } from './MiniPayProvider'

const applyMissionProgress = (
  missions: Mission[],
  { xpEarned, matchesPlayed }: { xpEarned: number; matchesPlayed: number },
) =>
  missions.map((mission) => {
    if (mission.state === 'claimed') return mission
    let progress = mission.progress
    if (mission.objective === 'matches_played') {
      progress = Math.min(mission.target, progress + matchesPlayed)
    } else if (mission.objective === 'xp_earned') {
      progress = Math.min(mission.target, progress + xpEarned)
    }
    const state = progress >= mission.target ? 'completed' : mission.state
    return { ...mission, progress, state }
  })

export type MissionContextValue = {
  missions: Mission[]
  loading: boolean
  recordMatchProgress: (payload: { xpEarned: number; matchesPlayed: number }) => void
  claimMission: (id: string) => void
  refreshMissions: () => Promise<void>
}

const MissionContext = createContext<MissionContextValue | undefined>(undefined)

type MissionState = {
  missions: Mission[]
  loading: boolean
}

type MissionAction =
  | { type: 'set_missions'; missions: Mission[] }
  | { type: 'set_loading'; value: boolean }
  | { type: 'apply_progress'; payload: { xpEarned: number; matchesPlayed: number } }
  | { type: 'mark_claimed'; id: string }

const initialState: MissionState = { missions: [], loading: true }

const missionReducer = (state: MissionState, action: MissionAction): MissionState => {
  switch (action.type) {
    case 'set_missions':
      return { ...state, missions: action.missions }
    case 'set_loading':
      if (state.loading === action.value) return state
      return { ...state, loading: action.value }
    case 'apply_progress':
      return { ...state, missions: applyMissionProgress(state.missions, action.payload) }
    case 'mark_claimed':
      return {
        ...state,
        missions: state.missions.map((mission) =>
          mission.id === action.id && mission.state === 'completed' ? { ...mission, state: 'claimed' } : mission,
        ),
      }
    default:
      return state
  }
}

export const MissionProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(missionReducer, initialState)
  const { missions, loading } = state
  const { address, status } = useMiniPayContext()

  const loadMissions = useCallback(async () => {
    if (!address || status !== 'ready') {
      dispatch({ type: 'set_missions', missions: [] })
      dispatch({ type: 'set_loading', value: status === 'checking' })
      return
    }
    dispatch({ type: 'set_loading', value: true })
    try {
      const res = await Api.fetchMissions(address)
      dispatch({ type: 'set_missions', missions: res.missions })
    } catch (err) {
      console.error('Failed to load missions', err)
    } finally {
      dispatch({ type: 'set_loading', value: false })
    }
  }, [address, status])

  useEffect(() => {
    void loadMissions()
  }, [loadMissions])

  const recordMatchProgress = useCallback(
    ({ xpEarned, matchesPlayed }: { xpEarned: number; matchesPlayed: number }) => {
      dispatch({ type: 'apply_progress', payload: { xpEarned, matchesPlayed } })
      if (!address) return
      void Api.recordMissionProgress({ walletAddress: address, xpEarned, matchesPlayed })
        .then((res) => {
          dispatch({ type: 'set_missions', missions: res.missions })
        })
        .catch((err) => console.error('Failed to persist mission progress', err))
    },
    [address],
  )

  const claimMission = useCallback(
    (id: string) => {
      dispatch({ type: 'mark_claimed', id })
      if (!address) return
      void Api.claimMission({ walletAddress: address, missionId: id })
        .then((res) => dispatch({ type: 'set_missions', missions: res.missions }))
        .catch((err) => console.error('Failed to claim mission', err))
    },
    [address],
  )

  const refreshMissions = useCallback(async () => {
    await loadMissions()
  }, [loadMissions])

  const value = useMemo(
    () => ({ missions, loading, recordMatchProgress, claimMission, refreshMissions }),
    [missions, loading, recordMatchProgress, claimMission, refreshMissions],
  )

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useMissionContext = () => {
  const ctx = useContext(MissionContext)
  if (!ctx) throw new Error('useMissionContext must be used within MissionProvider')
  return ctx
}
