import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLogo } from '../components/ui/AppLogo'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { StatusText } from '../components/ui/StatusText'
import { useMiniPay } from '../hooks/useMiniPay'
import { useProfile } from '../hooks/useProfile'

export const SplashScreen = () => {
  const { status, error, connect } = useMiniPay()
  const { loading } = useProfile()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'ready' && !loading) {
      navigate('/lobby', { replace: true })
    }
  }, [status, loading, navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-pp-bg px-4 text-white">
      <div className="glass-panel flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/60 to-pp-surface/70 p-6 shadow-[0_30px_80px_rgba(5,8,22,0.85)]">
        <AppLogo />
        {status === 'error' ? (
          <div className="text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button type="button" className="mt-3 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white transition hover:border-pp-primary" onClick={() => connect()}>
              Retry connection
            </button>
          </div>
        ) : (
          <>
            <LoadingSpinner />
            <StatusText message="Connecting via MiniPay..." />
          </>
        )}
      </div>
    </div>
  )
}
