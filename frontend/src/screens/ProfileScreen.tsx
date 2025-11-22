import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Camera, CheckCircle2, LockKeyhole, RotateCcw, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { SecondaryButton } from '../components/ui/SecondaryButton'
import { useUIStore } from '../state/UIStoreProvider'
import { Api } from '../lib/api'
import { useMiniPay } from '../hooks/useMiniPay'
import { useMissions } from '../hooks/useMissions'
import { CELO_TO_ZAR_RATE } from '../lib/currency'
import clsx from 'clsx'

const MATCHES_REQUIRED = 5
const avatarSeeds = ['aurora', 'midnight', 'ember', 'lagos', 'mint', 'noir']

const buildAvatarUrl = (seed: string) => `https://avatar.vercel.sh/pocket-${seed}.svg?size=128`

export const ProfileScreen = () => {
  const navigate = useNavigate()
  const { profile, loading, refreshProfile } = useProfile()
  const { pushToast, realMoneyMode, setRealMoneyMode } = useUIStore()
  const { refreshMissions } = useMissions()
  const miniPay = useMiniPay()
  const [form, setForm] = useState({ username: '', avatarUrl: '' })
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({ username: profile.username, avatarUrl: profile.avatarUrl })
  }, [profile])

  const matchesPlayed = profile?.stats.matches ?? 0
  const unlocksIn = Math.max(0, MATCHES_REQUIRED - matchesPlayed)
  const unlocked = matchesPlayed >= MATCHES_REQUIRED
  const progress = Math.min(matchesPlayed / MATCHES_REQUIRED, 1)

  const avatarOptions = useMemo(() => avatarSeeds.map((seed) => buildAvatarUrl(seed)), [])

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pp-bg text-white">
        Loading profile...
      </div>
    )
  }

  const handleResetProfile = async () => {
    if (!window.confirm('Reset your XP, stats, and demo credits? This cannot be undone.')) return
    setResetting(true)
    try {
      await Api.resetProfile(profile.walletAddress)
      await Promise.all([refreshProfile(), refreshMissions()])
      pushToast('Profile reset to starter values.', 'success')
    } catch (err) {
      console.error('Failed to reset profile', err)
      pushToast('Failed to reset profile. Try again.', 'error')
    } finally {
      setResetting(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!unlocked) {
      pushToast(`Play ${unlocksIn} more matches to unlock profile edits.`, 'error')
      return
    }
    const payload = {
      walletAddress: profile.walletAddress,
      username: form.username.trim(),
      avatarUrl: form.avatarUrl.trim(),
    }
    if (!payload.username || !payload.avatarUrl) {
      pushToast('Add both a nickname and avatar image.', 'error')
      return
    }
    setSaving(true)
    try {
      await Api.updateProfile(payload)
      await refreshProfile()
      pushToast('Profile updated', 'success')
    } catch (err) {
      console.error('Failed to update profile', err)
      pushToast('Failed to update profile. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

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
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Player profile</p>
            <h1 className="text-2xl font-semibold">Identity &amp; Avatar</h1>
          </div>
        </div>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/70 p-5 shadow-[0_25px_65px_rgba(5,8,22,0.7)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Matches played</p>
              <p className="text-2xl font-semibold">
                <span className="bg-gradient-to-r from-pp-primary to-pp-secondary bg-clip-text text-transparent">{matchesPlayed}</span>{' '}
                <span className="text-sm font-normal text-gray-400">/ {MATCHES_REQUIRED} required</span>
              </p>
            </div>
            {unlocked ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-pp-primary/20 px-3 py-1 text-xs font-semibold text-pp-primary">
                <CheckCircle2 className="h-4 w-4" /> Customization unlocked
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-gray-300">
                <LockKeyhole className="h-4 w-4" /> Locked
              </div>
            )}
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-pp-primary to-pp-secondary transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
          {!unlocked && (
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-gray-500">
              Play {unlocksIn} more {unlocksIn === 1 ? 'match' : 'matches'} to unlock nickname + avatar edits.
            </p>
          )}
        </section>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-[#091024] p-5 shadow-[0_25px_55px_rgba(5,8,22,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Escrow preference</p>
              <h2 className="text-xl font-semibold">Use real cUSD stakes</h2>
              <p className="text-xs text-gray-300">
                Toggle on to fund the Celo escrow contract via MiniPay before each match. Leave it off to keep using demo
                credits. 1 CELO ≈ R{CELO_TO_ZAR_RATE.toLocaleString()}.
              </p>
            </div>
            <label
              className={clsx(
                'flex cursor-pointer items-center gap-3 rounded-full border px-3 py-2 transition',
                realMoneyMode ? 'border-pp-primary bg-pp-primary/10' : 'border-white/20 bg-white/5',
                (miniPay.status !== 'ready' || !miniPay.isMiniPay) && 'cursor-not-allowed opacity-40',
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-300">
                {realMoneyMode ? 'On-chain' : 'Demo'}
              </span>
              <div className={clsx('relative h-6 w-12 rounded-full bg-gradient-to-r from-white/20 to-black/30')}>
                <span
                  className={clsx(
                    'absolute top-[2px] h-5 w-5 rounded-full bg-white shadow transition-transform',
                    realMoneyMode ? 'translate-x-6' : 'translate-x-0',
                  )}
                />
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={realMoneyMode}
                disabled={miniPay.status !== 'ready' || !miniPay.isMiniPay}
                onChange={(event) => setRealMoneyMode(event.target.checked)}
              />
            </label>
          </div>
          {miniPay.status !== 'ready' && (
            <p className="mt-3 text-xs text-pp-highlight">
              Connect MiniPay to enable real-money stakes. We’ll still use demo credits until MiniPay is connected.
            </p>
          )}
        </section>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/60 p-5 shadow-[0_25px_65px_rgba(5,8,22,0.7)]">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-pp-primary" />
            <div>
              <h2 className="text-xl font-semibold">Display identity</h2>
              <p className="text-xs text-gray-400">Nicknames and avatars show up across matches and leaderboards.</p>
            </div>
          </div>
          <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
            <label className="text-sm">
              Nickname
              <input
                type="text"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value.slice(0, 20) }))}
                placeholder="PocketQueen"
                disabled={!unlocked || saving}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white transition focus:border-pp-primary focus:outline-none disabled:opacity-50"
              />
              <span className="mt-1 block text-xs uppercase tracking-[0.3em] text-gray-500">3-20 characters</span>
            </label>

            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Select an avatar</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {avatarOptions.map((url) => (
                  <button
                    type="button"
                    key={url}
                    onClick={() => setForm((prev) => ({ ...prev, avatarUrl: url }))}
                    className={`rounded-2xl border-2 p-1 transition ${
                      form.avatarUrl === url ? 'border-pp-primary shadow-lg' : 'border-transparent'
                    }`}
                    disabled={!unlocked || saving}
                  >
                    <img src={url} alt="Avatar option" className="h-20 w-full rounded-xl object-cover" />
                  </button>
                ))}
              </div>
              <label className="mt-3 block text-sm">
                Or paste an image URL
                <div className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                  <Camera className="h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={form.avatarUrl}
                    disabled={!unlocked || saving}
                    onChange={(event) => setForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                    placeholder="https://avatar.vercel.sh/you"
                    className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
                  />
                </div>
              </label>
            </div>

            <PrimaryButton type="submit" className="w-full" disabled={!unlocked || saving}>
              {saving ? 'Saving...' : unlocked ? 'Save profile' : 'Locked until 5 matches'}
            </PrimaryButton>
          </form>
        </section>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/60 p-5 shadow-[0_25px_65px_rgba(5,8,22,0.7)]">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-pp-highlight" />
            <div>
              <h2 className="text-xl font-semibold">Reset progress</h2>
              <p className="text-xs text-gray-400">
                Wipe XP, credits, missions, and streaks but keep your nickname, avatar, and decks.
              </p>
            </div>
          </div>
          <SecondaryButton
            type="button"
            disabled={resetting}
            onClick={handleResetProfile}
            className="mt-4 w-full border-red-400 text-red-400 hover:border-red-300 hover:text-red-200"
          >
            {resetting ? 'Resetting...' : 'Reset profile to default'}
          </SecondaryButton>
        </section>
      </div>
    </div>
  )
}
