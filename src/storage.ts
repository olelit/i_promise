import { getWebApp, type TelegramCloudStorage } from './telegram'
import {
  HISTORY_MAX,
  isSkinId,
  TASK_DESCRIPTION_MAX,
  TASK_MAX_HOURS,
  TASK_MIN_HOURS,
  type TamagotchiState,
  type TamagotchiTask,
  type TaskRecord,
} from './tamagotchi'

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

function isValidRecord(value: unknown): value is TaskRecord {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.description === 'string' &&
    typeof record.hours === 'number' &&
    Number.isFinite(record.hours) &&
    typeof record.startedAt === 'number' &&
    Number.isFinite(record.startedAt) &&
    typeof record.finishedAt === 'number' &&
    Number.isFinite(record.finishedAt) &&
    record.finishedAt >= record.startedAt &&
    (record.status === 'done' || record.status === 'abandoned' || record.status === 'overdue')
  )
}

function normalizeHistory(value: unknown): TaskRecord[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter(isValidRecord)
    .slice(0, HISTORY_MAX)
    .map((record) => ({
      ...record,
      hours: Math.min(TASK_MAX_HOURS, Math.max(TASK_MIN_HOURS, Math.round(record.hours))),
      description: record.description.slice(0, TASK_DESCRIPTION_MAX),
    }))
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
  const offsetOk =
    candidate.clockOffset === undefined ||
    (typeof candidate.clockOffset === 'number' && Number.isFinite(candidate.clockOffset))
  return moodOk && lastSeenOk && awayOk && lastFedOk && taskOk && offsetOk
}

function normalizeState(state: TamagotchiState): TamagotchiState {
  const task = state.task ?? null
  const normalized: TamagotchiState & { rulesSeen?: unknown } = {
    ...state,
    lastFedAt: state.lastFedAt ?? null,
    skin: isSkinId(state.skin) ? state.skin : 'classic',
    clockOffset:
      typeof state.clockOffset === 'number' && Number.isFinite(state.clockOffset)
        ? state.clockOffset
        : 0,
    rulesSent: state.rulesSent === true,
    task:
      task === null
        ? null
        : {
            ...task,
            hours: Math.min(TASK_MAX_HOURS, Math.max(TASK_MIN_HOURS, Math.round(task.hours))),
            extensions: Math.max(0, Math.floor(task.extensions)),
            description: task.description.slice(0, TASK_DESCRIPTION_MAX),
          },
    history: normalizeHistory(state.history),
  }
  delete normalized.rulesSeen
  return normalized
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
