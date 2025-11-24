type DebugEntry = { ts: number; message: string }

let entries: DebugEntry[] = []
const listeners = new Set<(next: DebugEntry[]) => void>()
const MAX_ENTRIES = 50

export const addDebugLog = (message: string) => {
  const entry = { ts: Date.now(), message }
  entries = [entry, ...entries].slice(0, MAX_ENTRIES)
  for (const listener of listeners) {
    listener(entries)
  }
}

export const subscribeDebugLog = (listener: (next: DebugEntry[]) => void) => {
  listeners.add(listener)
  listener(entries)
  return () => listeners.delete(listener)
}

export const getDebugLog = () => entries
