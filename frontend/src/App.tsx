import { type ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SplashScreen } from './screens/SplashScreen'
import { LobbyScreen } from './screens/LobbyScreen'
import { MatchScreen } from './screens/MatchScreen'
import { DecksScreen } from './screens/DecksScreen'
import { MissionsScreen } from './screens/MissionsScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'
import { RulesScreen } from './screens/RulesScreen'
import { CreatorDeckScreen } from './screens/CreatorDeckScreen'
import { AdminScreen } from './screens/AdminScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { AppProviders } from './providers/AppProviders'
import { MatchmakingModal } from './components/match/MatchmakingModal'
import { ToastStack } from './components/ui/ToastStack'
import { DebugOverlay } from './components/debug/DebugOverlay'
import { useMiniPay } from './hooks/useMiniPay'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev-local'

const RequireMiniPay = ({ children }: { children: ReactElement }) => {
  const { status, isMiniPay } = useMiniPay()
  if (status !== 'ready' || !isMiniPay) {
    return <Navigate to="/" replace />
  }
  return children
}

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route
          path="/lobby"
          element={
            <RequireMiniPay>
              <LobbyScreen />
            </RequireMiniPay>
          }
        />
        <Route
          path="/match/:id"
          element={
            <RequireMiniPay>
              <MatchScreen />
            </RequireMiniPay>
          }
        />
        <Route
          path="/decks"
          element={
            <RequireMiniPay>
              <DecksScreen />
            </RequireMiniPay>
          }
        />
        <Route
          path="/creator-decks"
          element={
            <RequireMiniPay>
              <CreatorDeckScreen />
            </RequireMiniPay>
          }
        />
        <Route path="/admin" element={<AdminScreen />} />
        <Route
          path="/profile"
          element={
            <RequireMiniPay>
              <ProfileScreen />
            </RequireMiniPay>
          }
        />
        <Route
          path="/missions"
          element={
            <RequireMiniPay>
              <MissionsScreen />
            </RequireMiniPay>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <RequireMiniPay>
              <LeaderboardScreen />
            </RequireMiniPay>
          }
        />
        <Route
          path="/rules"
          element={
            <RequireMiniPay>
              <RulesScreen />
            </RequireMiniPay>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MatchmakingModal />
      <ToastStack />
      <div className="fixed bottom-2 right-3 z-50 rounded-full bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/60">
        v{APP_VERSION}
      </div>
      <DebugOverlay />
    </BrowserRouter>
  </AppProviders>
)

export default App
