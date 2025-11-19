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

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">1. Stake &amp; Lock</h2>
          <p className="mt-2 text-sm text-gray-300">
            Tap <span className="text-white">Play now</span> and the selected stake is secured via MiniPay.
            We escrow both players’ stakes (MiniPay transaction + backend confirmation) before a match starts.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-pp-primary" />
              MiniPay wallet connects automatically inside the splash screen.
            </li>
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-pp-primary" />
              Stakes live in a Celo escrow contract—cancellable if no opponent is found.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">2. Deal &amp; Reveal</h2>
          <p className="mt-2 text-sm text-gray-300">
            Each player receives three unique cards. Your deck skin defines your card backs. Opponent cards stay facedown until a
            reveal timer (~6s) expires to build suspense. After both sides are ready, we compare hands.
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-pp-primary" />
            3. Hand Ranking &amp; Winner Logic
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            PocketPoker uses a simplified three-card ranking. Higher entries beat lower ones; ties fall back to high-card math
            (we score each combo internally to avoid ties). Order from strongest to weakest:
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-200">
            {handOrder.map((hand) => (
              <li key={hand.title}>
                <span className="font-semibold text-white">{hand.title}</span> – {hand.description}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-gray-300">
            We score each hand under the hood:
            <br />• Combos supply a base score (Straight Flush &gt; Trips &gt; Straight &gt; Flush &gt; Pair &gt; High Card).
            <br />• High cards and kickers add decimals so ties are extremely rare.
            <br />• Winner takes the entire pot (stake × 2). XP and ELO updates propagate through your profile immediately.
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">4. Cosmetics &amp; Future Skins</h2>
          <p className="mt-2 text-sm text-gray-300">
            Deck skins are purely visual—but they show up on the table (card backs + glow). As MiniPay creators drop custom skins,
            you’ll be able to unlock, equip, and flex them during reveals.
          </p>
        </section>
      </div>
    </div>
  )
}
