import { getWebApp, type TelegramCloudStorage } from './telegram'
import type { TamagotchiState } from './tamagotchi'

const KEY = 'tamagotchi-state'

function isValidState(value: unknown): value is TamagotchiState {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  const moodOk = typeof candidate.mood === 'number' && Number.isFinite(candidate.mood)
  const lastSeenOk = typeof candidate.lastSeen === 'number' && Number.isFinite(candidate.lastSeen)
  const awayOk =
    candidate.awayUntil === null ||
    (typeof candidate.awayUntil === 'number' && Number.isFinite(candidate.awayUntil))
  return moodOk && lastSeenOk && awayOk
}

function parseState(raw: string | null | undefined): TamagotchiState | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValidState(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readLocal(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function writeLocal(value: string): void {
  try {
    window.localStorage.setItem(KEY, value)
  } catch {
    // storage unavailable (private mode) — state stays in memory
  }
}

interface CloudReadResult {
  ok: boolean
  value: string | null
}

function readCloud(storage: TelegramCloudStorage): Promise<CloudReadResult> {
  return new Promise((resolve) => {
    try {
      storage.getItem(KEY, (error, value) => {
        if (error) {
          resolve({ ok: false, value: null })
          return
        }
        resolve({ ok: true, value: value ?? null })
      })
    } catch {
      resolve({ ok: false, value: null })
    }
  })
}

export async function loadState(): Promise<TamagotchiState | null> {
  const cloud = getWebApp()?.CloudStorage
  if (cloud) {
    const result = await readCloud(cloud)
    if (result.ok) {
      return parseState(result.value)
    }
  }
  return parseState(readLocal())
}

export function saveState(state: TamagotchiState): Promise<void> {
  const value = JSON.stringify(state)
  const cloud = getWebApp()?.CloudStorage
  if (!cloud) {
    writeLocal(value)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    try {
      cloud.setItem(KEY, value, (error) => {
        if (error) {
          writeLocal(value)
        }
        resolve()
      })
    } catch {
      writeLocal(value)
      resolve()
    }
  })
}
