import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { DeckCard } from '../components/ui/DeckCard'
import type { CreatorDeckSubmission, DeckTheme } from '../types'
import { useProfile } from '../hooks/useProfile'
import { Api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { CreatorDeckPreviewCard } from '../components/creator/CreatorDeckPreviewCard'
import { useMiniPay } from '../hooks/useMiniPay'
import { useUIStore } from '../state/UIStoreProvider'

export const DecksScreen = () => {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<DeckTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [creatorDecks, setCreatorDecks] = useState<CreatorDeckSubmission[]>([])
  const [creatorLoading, setCreatorLoading] = useState(true)
  const { profile, equipDeck, refreshProfile } = useProfile()
  const { address, status, sendStake } = useMiniPay()
  const { pushToast } = useUIStore()
  const [purchasingDeckId, setPurchasingDeckId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Api.fetchDecks()
      .then((res) => {
        if (!mounted) return
        const normalized = (res?.decks ?? []).map((deck) => {
          const priceValue = typeof deck.price === 'number' ? deck.price : Number(deck.price ?? NaN)
          const price = Number.isFinite(priceValue) ? priceValue : undefined
          return {
            ...deck,
            price,
            previewImageUrl: deck.previewImageUrl ?? deck.previewImage ?? '/deck_1.jpg',
            unlockCondition: deck.unlockCondition || 'Creator drop',
            name: deck.name || deck.id || 'Deck',
            rarity: deck.rarity ?? 'common',
            description: deck.description || 'Limited drop deck skin.',
          }
        })
        setDecks(normalized)
      })
      .catch((err) => {
        console.error('Failed to load decks', err)
        if (!mounted) return
        setError((err as Error).message)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    Api.fetchCreatorDecks()
      .then((res) => {
        if (!mounted) return
        setCreatorDecks(res.submissions ?? [])
        setCreatorLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load creator decks', err)
        if (!mounted) return
        setCreatorLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const ownedDeckIds = profile?.unlockedDeckIds ?? []
  const activeDeckId = profile?.activeDeckId
  const canEquip = Boolean(profile)

  const handlePurchase = async (deck: DeckTheme) => {
    if (!deck.price) return
    if (!address || status !== 'ready') {
      pushToast('Connect MiniPay to buy creator skins.', 'error')
      return
    }
    try {
      setPurchasingDeckId(deck.id)
      pushToast(`Purchasing ${deck.name}...`, 'info')
      const { txHash } = await sendStake(deck.price)
      await Api.purchaseDeck({ walletAddress: address, deckId: deck.id, txHash })
      pushToast('Deck unlocked!', 'success')
      await refreshProfile()
    } catch (err) {
      console.error(err)
      pushToast((err as Error).message || 'Purchase failed', 'error')
    } finally {
      setPurchasingDeckId(null)
    }
  }

  return (
    <div className="min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto max-w-xl space-y-6">
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
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Deck library</p>
            <h1 className="text-2xl font-semibold">Deck Themes</h1>
          </div>
          <PrimaryButton className="ml-auto w-auto px-6 py-2 text-sm" onClick={() => navigate('/creator-decks')}>
            Creator portal
          </PrimaryButton>
        </div>
        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/70 p-5 shadow-[0_25px_60px_rgba(5,8,22,0.7)]">
          {error && (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-pp-primary" />
              Equip a deck to change your card backs in every match.
            </p>
            <p className="text-xs text-gray-400">
              Matches cost demo credits; creator skins require MiniPay (2% platform fee included).
            </p>
          </div>
          <div className="mt-5 grid gap-4">
            {loading ? (
              <p className="text-sm text-gray-400">Loading decks…</p>
            ) : decks.length === 0 && !error ? (
              <p className="text-sm text-gray-400">No decks available yet. Try again in a moment.</p>
            ) : (
              decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  owned={ownedDeckIds.includes(deck.id)}
                  active={activeDeckId === deck.id}
                  onEquip={canEquip ? (id) => equipDeck(id) : undefined}
                  onPurchase={canEquip ? handlePurchase : undefined}
                  purchaseDisabled={purchasingDeckId === deck.id}
                />
              ))
            )}
          </div>
        </section>
        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/70 p-5 shadow-[0_25px_60px_rgba(5,8,22,0.7)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Creator submissions</p>
              <h2 className="text-xl font-semibold">Community drops</h2>
            </div>
            <PrimaryButton className="px-4 py-2 text-xs" onClick={() => navigate('/creator-decks')}>
              Submit a deck
            </PrimaryButton>
          </div>
          {creatorLoading ? (
            <p className="text-sm text-gray-400">Loading creator entries...</p>
          ) : creatorDecks.filter((deck) => deck.status !== 'rejected').length === 0 ? (
            <p className="text-sm text-gray-400">No submissions yet. Share your art via the creator portal.</p>
          ) : (
            <div className="grid gap-4">
              {creatorDecks
                .filter((deck) => deck.status !== 'rejected')
                .map((deck) => (
                  <CreatorDeckPreviewCard key={deck.id} submission={{ ...deck, status: deck.status ?? 'pending' }} />
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
