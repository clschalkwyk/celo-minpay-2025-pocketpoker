import { ArrowLeft, Shield, Wallet, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const handOrder = [
  { title: 'Straight Flush', description: 'Three cards in sequence, all in the same suit.' },
  { title: 'Three of a Kind', description: 'All three cards share the same rank.' },
  { title: 'Straight', description: 'Three cards in sequence of any suits.' },
  { title: 'Flush', description: 'Three cards of the same suit, any ranks.' },
  { title: 'Pair', description: 'Two cards share a rank. Highest kicker wins ties.' },
  { title: 'High Card', description: 'No combos? Highest card wins with kicker tiebreakers.' },
]

export const RulesScreen = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-pp-primary hover:text-pp-primary"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">How it works</p>
            <h1 className="text-2xl font-semibold">Rules &amp; Scoring</h1>
          </div>
        </div>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/50 to-pp-surface/70 p-5 shadow-[0_20px_55px_rgba(5,8,22,0.7)]">
          <h2 className="text-lg font-semibold">1. Stake &amp; Lock</h2>
          <p className="mt-2 text-sm text-gray-300">
            Tap <span className="text-white">Play now</span> and the selected stake is secured via MiniPay. Stakes are escrowed by
            the contract before the match starts—contestants are only charged once both players commit.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-pp-primary" />
              MiniPay wallet auto-connects from the splash screen when the app detects MiniPay.
            </li>
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-pp-primary" />
              Stakes live in the escrow contract—if no opponent appears, credits are refunded instantly.
            </li>
          </ul>
        </section>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-[#051021] p-5 shadow-[0_20px_55px_rgba(5,8,22,0.7)]">
          <h2 className="text-lg font-semibold">2. Deal &amp; Reveal</h2>
          <p className="mt-2 text-sm text-gray-300">
            Each player receives three unique cards. Deck skins control the card backs, while opponent cards stay facedown until
            the reveal timer (~6s) expires to keep suspense high. Once both sides are ready, we compare hands automatically.
          </p>
        </section>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/60 p-5 shadow-[0_20px_55px_rgba(5,8,22,0.7)]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-pp-primary" />
            3. Hand Ranking &amp; Winner Logic
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            PocketPoker ranks three-card hands with a simplified hierarchy. Higher combos beat lower ones; ties fall back to
            kicker math so results are decisive.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-200">
            {handOrder.map((hand) => (
              <li key={hand.title}>
                <span className="font-semibold text-white">{hand.title}</span> – {hand.description}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-gray-300">
            Scoring notes:
            <br />• Combos provide a base score (Straight Flush down to High Card).
            <br />• Kickers add decimals to remove ties.
            <br />• Winner takes the pot (stake × 2) + XP/ELO updates fire through the profile immediately.
          </p>
        </section>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-[#091024] p-5 shadow-[0_20px_55px_rgba(5,8,22,0.7)]">
          <h2 className="text-lg font-semibold">4. Cosmetics &amp; Future Skins</h2>
          <p className="mt-2 text-sm text-gray-300">
            Deck skins are purely visual—but they show up on the table (card backs, glows). As creators drop custom skins via MiniPay,
            you’ll unlock, equip, and flex them during the reveal and on the leaderboard.
          </p>
        </section>
      </div>
    </div>
  )
}
