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

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/match/:id" element={<MatchScreen />} />
        <Route path="/decks" element={<DecksScreen />} />
        <Route path="/creator-decks" element={<CreatorDeckScreen />} />
        <Route path="/admin" element={<AdminScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/missions" element={<MissionsScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/rules" element={<RulesScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MatchmakingModal />
      <ToastStack />
      <DebugOverlay />
    </BrowserRouter>
  </AppProviders>
)

export default App
