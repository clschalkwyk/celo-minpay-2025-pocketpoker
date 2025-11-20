import { useEffect, useMemo, useRef } from 'react'

const createAudio = (src: string, options?: { loop?: boolean; volume?: number }) => {
  const audio = typeof Audio !== 'undefined' ? new Audio(src) : undefined
  if (!audio) return undefined
  audio.loop = options?.loop ?? false
  audio.volume = options?.volume ?? 0.5
  return audio
}

export const useAmbience = () => {
  const swipeRef = useRef<HTMLAudioElement | null>(null)
  const ambianceRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    swipeRef.current = createAudio('/audio/card-swipe.mp3', { volume: 0.8 }) ?? null
    ambianceRef.current = createAudio('/audio/casino-ambiance.mp3', { loop: true, volume: 0.25 }) ?? null

    return () => {
      swipeRef.current?.pause()
      swipeRef.current = null
      ambianceRef.current?.pause()
      ambianceRef.current = null
    }
  }, [])

  const playCardSwipe = () => {
    if (!swipeRef.current) return
    swipeRef.current.currentTime = 0
    void swipeRef.current.play().catch(() => {})
  }

  const playAmbiance = () => {
    if (!ambianceRef.current) return
    if (ambianceRef.current.paused) {
      void ambianceRef.current.play().catch(() => {})
    }
  }

  const stopAmbiance = () => {
    if (!ambianceRef.current) return
    ambianceRef.current.pause()
    ambianceRef.current.currentTime = 0
  }

  return useMemo(
    () => ({
      playCardSwipe,
      playAmbiance,
      stopAmbiance,
    }),
    [],
  )
}
