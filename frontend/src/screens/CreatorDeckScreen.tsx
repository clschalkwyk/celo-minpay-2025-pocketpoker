import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, Upload, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Api } from '../lib/api'
import type { CreatorDeckSubmission, DeckTheme } from '../types'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { useUIStore } from '../state/UIStoreProvider'

type CreatorDeckForm = {
  deckName: string
  creatorName: string
  rarity: DeckTheme['rarity']
  description: string
  previewImageUrl: string
}

const blankForm: CreatorDeckForm = {
  deckName: '',
  creatorName: '',
  rarity: 'rare',
  description: '',
  previewImageUrl: '',
}

const rarityOptions: DeckTheme['rarity'][] = ['common', 'rare', 'ranked', 'legendary', 'mythic']

const statusBadges: Record<CreatorDeckSubmission['status'], { label: string; className: string }> = {
  pending: { label: 'Pending review', className: 'bg-amber-500/10 text-amber-200 border border-amber-400/40' },
  approved: { label: 'Live soon', className: 'bg-sky-500/10 text-sky-100 border border-sky-400/40' },
  rejected: { label: 'Needs revision', className: 'bg-red-500/10 text-red-200 border border-red-400/40' },
}

export const CreatorDeckScreen = () => {
  const navigate = useNavigate()
  const { pushToast } = useUIStore()
  const [form, setForm] = useState<CreatorDeckForm>(blankForm)
  const [previewDataUrl, setPreviewDataUrl] = useState<string>()
  const [previewFileName, setPreviewFileName] = useState<string>()
  const [submissions, setSubmissions] = useState<CreatorDeckSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Api.fetchCreatorDecks()
      .then((res) => {
        setSubmissions(res.submissions)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load creator decks', err)
        setLoading(false)
      })
  }, [])

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePreviewFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
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
    const payload = {
      ...form,
      deckName: form.deckName.trim(),
      creatorName: form.creatorName.trim(),
      description: form.description.trim(),
      previewImageUrl: (previewDataUrl ?? form.previewImageUrl).trim(),
    }
    if (!payload.deckName || !payload.creatorName || !payload.description || !payload.previewImageUrl) {
      pushToast('Fill out name, creator, preview, and description before submitting.', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await Api.submitCreatorDeck(payload)
      setSubmissions((prev) => [res.submission, ...prev])
      setForm(blankForm)
      setPreviewDataUrl(undefined)
      setPreviewFileName(undefined)
      pushToast('Deck submitted for review', 'success')
    } catch (err) {
      console.error(err)
      pushToast('Failed to submit deck. Try again.', 'error')
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

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-pp-primary" />
            <div>
              <h2 className="text-xl font-semibold">Submit a deck</h2>
              <p className="text-xs text-gray-400">PNG/JPEG, 3:4 crop recommended. Mobile-first preview shown below.</p>
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

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-pp-primary" />
            <div>
              <h2 className="text-xl font-semibold">Review queue</h2>
              <p className="text-xs text-gray-400">Submissions are reviewed before going live. Moderation happens in the admin dashboard.</p>
            </div>
          </div>
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
                const badge = statusBadges[submission.status]
                return (
                  <div key={submission.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row">
                    <img
                      src={submission.previewImageUrl}
                      alt={submission.deckName}
                      className="h-44 w-full rounded-2xl object-cover md:w-48"
                    />
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-white">{submission.deckName}</p>
                        <span className="text-xs uppercase tracking-[0.3em] text-gray-400">{submission.rarity}</span>
                        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${badge.className}`}>
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
