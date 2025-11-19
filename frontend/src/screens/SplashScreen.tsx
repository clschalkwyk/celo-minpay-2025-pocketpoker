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
      <AppLogo />
      {status === 'error' ? (
        <div className="text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button type="button" className="mt-3 underline" onClick={() => connect()}>
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
  )
}
