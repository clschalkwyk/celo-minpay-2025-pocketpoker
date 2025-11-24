import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, Upload, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Api } from '../lib/api'
import type { CreatorDeckSubmission, DeckTheme } from '../types'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { useUIStore } from '../state/UIStoreProvider'
import { useProfile } from '../hooks/useProfile'

type CreatorDeckForm = {
  deckName: string
  creatorName: string
  rarity: DeckTheme['rarity']
  description: string
  previewImageUrl: string
  creatorWallet: string
}

const blankForm: CreatorDeckForm = {
  deckName: '',
  creatorName: '',
  rarity: 'rare',
  description: '',
  previewImageUrl: '',
  creatorWallet: '',
}

const rarityOptions: DeckTheme['rarity'][] = ['common', 'rare', 'ranked', 'legendary', 'mythic']

const statusBadges: Record<CreatorDeckSubmission['status'], { label: string; className: string }> = {
  pending: { label: 'Pending review', className: 'bg-amber-500/10 text-amber-200 border border-amber-400/40' },
  approved: { label: 'Live soon', className: 'bg-sky-500/10 text-sky-100 border border-sky-400/40' },
  rejected: { label: 'Needs revision', className: 'bg-red-500/10 text-red-200 border border-red-400/40' },
}

const MAX_UPLOAD_BYTES = 4.4 * 1024 * 1024;
const normalizeSubmission = (submission: CreatorDeckSubmission): CreatorDeckSubmission => ({
  ...submission,
  status: submission.status ?? 'pending',
  rarity: submission.rarity ?? 'common',
  previewImageUrl: submission.previewImageUrl || '/deck_1.jpg',
  deckName: submission.deckName || 'Deck submission',
  description: submission.description || 'Creator-provided deck art.',
  submittedAt: submission.submittedAt ?? Date.now(),
})

export const CreatorDeckScreen = () => {
  const navigate = useNavigate()
  const { pushToast } = useUIStore()
  const { profile } = useProfile()
  const [form, setForm] = useState<CreatorDeckForm>(blankForm)
  const [previewDataUrl, setPreviewDataUrl] = useState<string>()
  const [previewFileName, setPreviewFileName] = useState<string>()
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [submissions, setSubmissions] = useState<CreatorDeckSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    Api.fetchCreatorDecks()
      .then((res) => {
        if (!mounted) return
        const normalized = (res.submissions ?? [])
          .map(normalizeSubmission)
          .filter(
            (s) =>
              s.status === 'approved' ||
              (s.status === 'pending' && s.creatorWallet === profile?.walletAddress),
          )
        setSubmissions(normalized)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load creator decks', err)
        if (!mounted) return
        setError((err as Error).message)
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [profile?.walletAddress])

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setForm((prev: CreatorDeckForm) => ({ ...prev, [name]: value }))
  }

  const handlePreviewFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      pushToast('Image too large. Please keep under ~4.4MB or compress before uploading.', 'error')
      alert('Image too large. Please keep under ~4.4MB or compress before uploading.')
      return
    }
    setPreviewFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewDataUrl(reader.result as string)
      setPreviewFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    const fallbackUrl = form.previewImageUrl.trim()
    const dataUrl = previewDataUrl?.trim()
    if (!dataUrl && !fallbackUrl) {
      pushToast('Add a preview image (upload a file or paste a URL).', 'error')
      return
    }
    if (dataUrl && dataUrl.length > MAX_UPLOAD_BYTES * 1.4) {
      pushToast('Preview too large. Please compress below 4.4MB.', 'error')
      return
    }
    const payload = {
      ...form,
      deckName: form.deckName.trim(),
      creatorName: form.creatorName.trim(),
      description: form.description.trim(),
      previewImageUrl: fallbackUrl || undefined,
      imageData: dataUrl,
      fileName: previewFileName ?? previewFile?.name,
      contentType: previewFile?.type || (dataUrl?.split(';')[0]?.replace('data:', '') || undefined),
      creatorWallet: form.creatorWallet.trim(),
    }
    if (!payload.deckName || !payload.creatorName || !payload.description || (!payload.previewImageUrl && !payload.imageData) || !payload.creatorWallet) {
      pushToast('Fill out name, creator, preview, description, and wallet before submitting.', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await Api.submitCreatorDeck(payload)
      setSubmissions((prev: CreatorDeckSubmission[]) => [normalizeSubmission(res.submission), ...prev])
      setForm(blankForm)
      setPreviewDataUrl(undefined)
      setPreviewFileName(undefined)
      setPreviewFile(null)
      pushToast('Deck submitted for review', 'success')
    } catch (err) {
      console.error(err)
      pushToast((err as Error).message || 'Failed to submit deck. Try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
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
            <h1 className="text-2xl font-semibold">Creator deck portal</h1>
            <p className="text-xs text-gray-400">Submit art and review community skins before they ship.</p>
          </div>
        </div>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/70 p-5 shadow-[0_25px_65px_rgba(5,8,22,0.7)]">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-pp-primary" />
            <div>
              <h2 className="text-xl font-semibold">Submit a deck</h2>
              <p className="text-xs text-gray-400">
                PNG/JPEG, 3:4 crop recommended. Files upload to S3 (keep under ~5MB) or paste a hosted URL. Mobile-first preview
                shown below.
              </p>
            </div>
          </div>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                Deck name
                <input
                  type="text"
                  name="deckName"
                  value={form.deckName}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  placeholder="Ubuntu Bloom"
                />
              </label>
              <label className="text-sm">
                Creator / studio
                <input
                  type="text"
                  name="creatorName"
                  value={form.creatorName}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  placeholder="Aya Creative"
                />
              </label>
            </div>
            <label className="text-sm">
              Creator wallet
              <input
                type="text"
                name="creatorWallet"
                value={form.creatorWallet}
                onChange={handleInputChange}
                placeholder="0x1234..."
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                Rarity
                <select
                  name="rarity"
                  value={form.rarity}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  {rarityOptions.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {rarity}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Preview link (optional if uploading)
                <input
                  type="url"
                  name="previewImageUrl"
                  value={form.previewImageUrl}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
            <label className="text-sm">
              Description
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                placeholder="Tell players what inspired this drop."
              ></textarea>
            </label>
            <label className="text-sm">
              Upload preview (PNG/JPEG)
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handlePreviewFile}
                className="mt-1 w-full rounded-2xl border border-dashed border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              />
              {previewFileName && <p className="mt-1 text-xs text-gray-400">Attached: {previewFileName}</p>}
            </label>
            {(previewDataUrl || form.previewImageUrl) && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Live preview</p>
                <img
                  src={previewDataUrl ?? form.previewImageUrl}
                  alt="Deck preview"
                  className="mt-2 h-48 w-full rounded-3xl object-cover"
                />
              </div>
            )}
            <PrimaryButton type="submit" className="w-full md:w-auto" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Send to review'}
            </PrimaryButton>
          </form>
        </section>

        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-[#05081a] p-5 shadow-[0_25px_60px_rgba(5,8,22,0.7)]">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-pp-primary" />
            <div>
              <h2 className="text-xl font-semibold">Review queue</h2>
              <p className="text-xs text-gray-400">Submissions are reviewed before going live. Moderation happens in the admin dashboard.</p>
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}
          {loading ? (
            <p className="mt-4 text-sm text-gray-400">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
              <AlertTriangle className="h-4 w-4" />
              No creator decks yet. Point artists to this portal.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {submissions.map((submission) => {
                const badge = statusBadges[submission.status] ?? statusBadges.pending
                return (
                  <div
                    key={submission.id}
                    className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-[#050b17] p-4 shadow-[0_15px_45px_rgba(5,8,22,0.65)] md:flex-row"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-pp-primary/10 via-transparent to-pp-secondary/10 blur-3xl opacity-40" />
                    <img
                      src={submission.previewImageUrl}
                      alt={submission.deckName}
                      className="relative h-44 w-full rounded-2xl object-cover md:w-48"
                    />
                    <div className="relative flex flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-white">{submission.deckName}</p>
                        <span className="text-xs uppercase tracking-[0.3em] text-gray-400">{submission.rarity}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs uppercase tracking-[0.3em] text-pp-highlight">By {submission.creatorName}</p>
                      <p className="text-sm text-gray-300">{submission.description}</p>
                      <p className="text-xs text-gray-400">Submitted {new Date(submission.submittedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
