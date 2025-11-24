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
  const [equippingDeckId, setEquippingDeckId] = useState<string | null>(null)
  const [activeOverride, setActiveOverride] = useState<string | undefined>(undefined)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Api.fetchDecks()
      .then((res) => {
        if (!mounted) return
        const normalized = (res?.decks ?? []).map((deck) => {
          const priceValue = typeof deck.price === 'number' ? deck.price : Number(deck.price ?? NaN)
          const isCreatorDrop = Boolean(deck.creatorWallet)
          const price = Number.isFinite(priceValue) ? priceValue : isCreatorDrop ? 1 : undefined
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
        const normalized = (res.submissions ?? []).map((submission) => ({
          ...submission,
          price: submission.price ?? 1,
          status: submission.status ?? 'pending',
        }))
        setCreatorDecks(normalized)
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

  const userWallet = profile?.walletAddress?.toLowerCase()
  const ownedCreatorIds = userWallet
    ? creatorDecks
        .filter(
          (deck) =>
            deck.status === 'approved' &&
            deck.creatorWallet?.toLowerCase() === userWallet,
        )
        .map((deck) => deck.id)
    : []
  const ownedFromDeckList = userWallet
    ? decks
        .filter((deck) => deck.creatorWallet?.toLowerCase() === userWallet)
        .map((deck) => deck.id)
    : []
  const ownedDeckIds = new Set([...(profile?.unlockedDeckIds ?? []), ...ownedCreatorIds, ...ownedFromDeckList])
  useEffect(() => {
    if (profile?.activeDeckId) {
      setActiveOverride(profile.activeDeckId)
    }
  }, [profile?.activeDeckId])

  const activeDeckId = activeOverride ?? profile?.activeDeckId
  const canEquip = Boolean(profile)

  const handlePurchase = async (deck: DeckTheme) => {
    if (!deck.price) return
    const isOwnSubmission =
      userWallet && deck.creatorWallet && deck.creatorWallet.toLowerCase() === userWallet
    if (isOwnSubmission) {
      pushToast('You already own this creator drop.', 'error')
      return
    }
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

  const handleEquipDeck = async (deck: { id: string; creatorWallet?: string; status?: string }) => {
    if (!profile?.walletAddress) {
      pushToast('Sign in to equip decks.', 'error')
      return
    }
    const isOwnSubmission = deck.creatorWallet && userWallet && deck.creatorWallet.toLowerCase() === userWallet
    const alreadyOwned = ownedDeckIds.has(deck.id)
    try {
      setEquippingDeckId(deck.id)
      if (!alreadyOwned) {
        if (isOwnSubmission) {
          await Api.unlockDeck({ walletAddress: profile.walletAddress, deckId: deck.id })
        } else {
          pushToast('Purchase this creator drop to unlock it first.', 'error')
          return
        }
      }
      if (profile.walletAddress) {
        await Api.unlockDeck({ walletAddress: profile.walletAddress, deckId: deck.id })
      }
      await equipDeck(deck.id)
      await refreshProfile()
      setActiveOverride(deck.id)
      pushToast('Deck equipped!', 'success')
    } catch (err) {
      console.error(err)
      pushToast((err as Error).message || 'Failed to equip deck', 'error')
    } finally {
      setEquippingDeckId(null)
    }
  }

  const handlePurchaseCreator = async (submission: CreatorDeckSubmission) => {
    const deck: DeckTheme = {
      id: submission.id,
      name: submission.deckName,
      creatorName: submission.creatorName,
      creatorWallet: submission.creatorWallet,
      price: submission.price ?? 1,
      rarity: submission.rarity ?? 'common',
      description: submission.description ?? 'Limited drop deck skin.',
      previewImageUrl: submission.previewImageUrl ?? '/deck_1.jpg',
      unlockCondition: 'Creator drop',
      status: 'live',
    }
    await handlePurchase(deck)
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
                  owned={ownedDeckIds.has(deck.id)}
                  active={activeDeckId === deck.id}
                  onEquip={canEquip ? () => handleEquipDeck(deck) : undefined}
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
          ) : creatorDecks.filter((deck) => deck.status === 'approved').length === 0 ? (
            <p className="text-sm text-gray-400">No submissions yet. Share your art via the creator portal.</p>
          ) : (
            <div className="grid gap-4">
              {creatorDecks
                .filter((deck) => deck.status === 'approved')
                .map((deck) => {
                  const isCreator = deck.creatorWallet?.toLowerCase() === userWallet
                  const owned = ownedDeckIds.has(deck.id) || isCreator
                  return (
                    <CreatorDeckPreviewCard
                      key={deck.id}
                      submission={{ ...deck, status: deck.status ?? 'pending' }}
                      owned={owned}
                      isCreator={isCreator}
                      active={activeDeckId === deck.id}
                      onEquip={canEquip ? () => handleEquipDeck(deck) : undefined}
                      equipping={equippingDeckId === deck.id}
                      onPurchase={canEquip && !isCreator ? () => handlePurchaseCreator(deck) : undefined}
                      purchaseDisabled={purchasingDeckId === deck.id}
                    />
                  )
                })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
