import { getWebApp, type TelegramCloudStorage } from './telegram'
import type { TamagotchiState, TamagotchiTask } from './tamagotchi'

const KEY = 'tamagotchi-state'

function isValidTask(value: unknown): value is TamagotchiTask {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.description === 'string' &&
    typeof candidate.hours === 'number' &&
    Number.isFinite(candidate.hours) &&
    typeof candidate.startedAt === 'number' &&
    Number.isFinite(candidate.startedAt) &&
    typeof candidate.deadline === 'number' &&
    Number.isFinite(candidate.deadline) &&
    typeof candidate.extensions === 'number' &&
    Number.isFinite(candidate.extensions)
  )
}

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
  const lastFedOk =
    candidate.lastFedAt === undefined ||
    candidate.lastFedAt === null ||
    (typeof candidate.lastFedAt === 'number' && Number.isFinite(candidate.lastFedAt))
  const taskOk =
    candidate.task === undefined || candidate.task === null || isValidTask(candidate.task)
  return moodOk && lastSeenOk && awayOk && lastFedOk && taskOk
}

function normalizeState(state: TamagotchiState): TamagotchiState {
  return { ...state, lastFedAt: state.lastFedAt ?? null, task: state.task ?? null }
}

function parseState(raw: string | null | undefined): TamagotchiState | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValidState(parsed) ? normalizeState(parsed) : null
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
