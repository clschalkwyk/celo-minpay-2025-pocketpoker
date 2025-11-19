import type { ReactNode } from 'react'
import { MiniPayProvider } from './MiniPayProvider'
import { ProfileProvider } from './ProfileProvider'
import { MissionProvider } from './MissionProvider'
import { UIStoreProvider } from '../state/UIStoreProvider'
import { MatchProvider } from './MatchProvider'

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <MiniPayProvider>
    <ProfileProvider>
      <MissionProvider>
        <UIStoreProvider>
          <MatchProvider>{children}</MatchProvider>
        </UIStoreProvider>
      </MissionProvider>
    </ProfileProvider>
  </MiniPayProvider>
)
