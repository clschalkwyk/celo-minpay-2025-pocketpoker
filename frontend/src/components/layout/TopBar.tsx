import { RefreshCcw } from 'lucide-react'

export type TopBarProps = {
  avatarUrl: string
  username: string
  rankTitle: string
  balanceLabel: string
  creditsLabel: string
  onRefreshBalance?: () => void
}

export const TopBar = ({ avatarUrl, username, rankTitle, balanceLabel, creditsLabel, onRefreshBalance }: TopBarProps) => (
  <header className="glass-panel flex flex-col gap-4 rounded-3xl px-4 py-4">
    <div className="flex items-center gap-3">
      <img src={avatarUrl} alt={username} className="h-12 w-12 rounded-2xl border border-white/10 object-cover" />
      <div>
        <p className="text-base font-semibold text-white">{username}</p>
        <p className="text-xs uppercase tracking-widest text-pp-primary">{rankTitle}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 text-sm text-white">
      <span className="flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em]">
        {creditsLabel}
      </span>
      <button
        type="button"
        onClick={onRefreshBalance}
        className="flex w-full items-center justify-between gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        <span>{balanceLabel}</span>
        <RefreshCcw className="h-4 w-4" />
      </button>
    </div>
  </header>
)
