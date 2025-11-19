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
  const [error, setError] = useState<string>()
  const [creatorDecks, setCreatorDecks] = useState<CreatorDeckSubmission[]>([])
  const [creatorLoading, setCreatorLoading] = useState(true)
  const { profile, equipDeck, refreshProfile } = useProfile()
  const { address, status, sendStake } = useMiniPay()
  const { pushToast } = useUIStore()
  const [purchasingDeckId, setPurchasingDeckId] = useState<string | null>(null)

  useEffect(() => {
    Api.fetchDecks()
      .then((res) => {
        setDecks(res.decks)
      })
      .catch((err) => setError((err as Error).message))
  }, [])

  useEffect(() => {
    Api.fetchCreatorDecks()
      .then((res) => {
        setCreatorDecks(res.submissions)
        setCreatorLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load creator decks', err)
        setCreatorLoading(false)
      })
  }, [])

  if (!profile) return null

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
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-pp-primary hover:text-pp-primary"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-semibold">Deck Themes</h1>
          <PrimaryButton className="ml-auto w-auto px-6 py-2 text-sm" onClick={() => navigate('/creator-decks')}>
            Creator portal
          </PrimaryButton>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <p className="text-xs text-gray-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-pp-primary" />
          Equip a deck to change your card backs in every match.
        </p>
        <p className="text-xs text-gray-400">Matches cost demo credits; creator skins require MiniPay and include a 2% platform fee.</p>
        <div className="grid gap-4">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              owned={profile.unlockedDeckIds.includes(deck.id)}
              active={profile.activeDeckId === deck.id}
              onEquip={(id) => equipDeck(id)}
              onPurchase={handlePurchase}
              purchaseDisabled={purchasingDeckId === deck.id}
            />
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Creator submissions</h2>
            <p className="text-xs text-gray-400">Skins from the community appear here before they go live.</p>
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
                  <CreatorDeckPreviewCard key={deck.id} submission={deck} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
