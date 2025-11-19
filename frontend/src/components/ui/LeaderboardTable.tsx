import clsx from 'clsx'
import type { LeaderboardEntry } from '../../types'

export type LeaderboardTableProps = {
  entries: LeaderboardEntry[]
  selfId?: string
}

const ribbonClasses = ['bg-gradient-to-r from-amber-300 to-yellow-500', 'bg-gradient-to-r from-slate-300 to-slate-100', 'bg-gradient-to-r from-orange-200 to-amber-200']

export const LeaderboardTable = ({ entries, selfId }: LeaderboardTableProps) => (
  <div className="space-y-3">
    {entries.map((entry) => {
      const isSelf = entry.id === selfId
      const isTopThree = entry.rank <= 3
      const avatar = entry.avatarUrl ?? `https://avatar.vercel.sh/${entry.walletAddress ?? entry.id}`
      return (
        <div
          key={entry.id}
          className={clsx(
            'glass-panel flex items-center gap-3 rounded-3xl px-4 py-4',
            isSelf && 'border-pp-primary/60 bg-pp-primary/5 shadow-glow-green',
          )}
        >
          <div
            className={clsx(
              'flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white',
              isTopThree ? ribbonClasses[entry.rank - 1] : 'bg-white/10 text-gray-300',
            )}
          >
            #{entry.rank}
          </div>
          <img src={avatar} alt={entry.username} className="h-12 w-12 rounded-2xl object-cover" />
          <div className="flex-1">
            <p className="font-semibold text-white">{entry.username}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{entry.wins} wins</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-white">{entry.elo}</p>
            <p className="text-xs text-gray-400">ELO</p>
          </div>
        </div>
      )
    })}
  </div>
)
