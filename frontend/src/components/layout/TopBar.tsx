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
  <header className="glass-panel relative flex flex-col gap-4 rounded-3xl border border-pp-secondary/40 bg-[#0B1020]/80 px-5 py-5 shadow-[0_20px_45px_rgba(5,8,22,0.75)]">
    <div className="flex items-center gap-3">
      <img src={avatarUrl} alt={username} className="h-12 w-12 rounded-2xl border border-white/10 object-cover" />
      <div>
        <p className="text-base font-semibold text-white">{username}</p>
        <p className="text-xs uppercase tracking-[0.4em] text-pp-primary">{rankTitle}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 text-sm text-white">
      <span className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-r from-pp-primary/80 to-pp-secondary/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.4em] shadow-[0_10px_30px_rgba(53,208,127,0.35)]">
        {creditsLabel}
      </span>
      <button
        type="button"
        onClick={onRefreshBalance}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white transition hover:border-pp-primary/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pp-primary/60"
      >
        <span>{balanceLabel}</span>
        <RefreshCcw className="h-4 w-4" />
      </button>
    </div>
  </header>
)
