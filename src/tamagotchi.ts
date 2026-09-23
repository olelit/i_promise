export interface TamagotchiTask {
  description: string
  hours: number
  startedAt: number
  deadline: number
  extensions: number
}

export interface TamagotchiState {
  mood: number
  lastSeen: number
  awayUntil: number | null
  lastFedAt: number | null
  task: TamagotchiTask | null
}

export const MOOD_MAX = 100
export const MOOD_MIN = -100
export const INITIAL_MOOD = 100
export const DECAY_PER_HOUR = 20
export const AWAY_DURATION_MS = 2 * 3_600_000
export const RETURN_MOOD = -50
export const TICK_MS = 60_000
export const FEED_GAIN = 20
export const FEED_CAP = 20
export const FEED_COOLDOWN_MS = 24 * 3_600_000
export const TASK_MIN_HOURS = 1
export const TASK_MAX_HOURS = 12
export const TASK_MOOD_BASE = 20
export const TASK_MOOD_PER_HOUR = 10
export const TASK_DESCRIPTION_MAX = 120
export const EXTENSION_MS = 3_600_000

const HOUR_MS = 3_600_000

export function createInitialState(now: number): TamagotchiState {
  return { mood: INITIAL_MOOD, lastSeen: now, awayUntil: null, lastFedAt: null, task: null }
}

function decayRate(state: TamagotchiState): number {
  if (state.task === null) {
    return DECAY_PER_HOUR
  }
  return DECAY_PER_HOUR * 2 ** state.task.extensions
}

export function applyDecay(state: TamagotchiState, now: number): TamagotchiState {
  if (state.task !== null && now >= state.task.deadline) {
    return { mood: 0, lastSeen: now, awayUntil: null, lastFedAt: state.lastFedAt, task: null }
  }

  if (state.awayUntil !== null) {
    if (now >= state.awayUntil) {
      return {
        mood: RETURN_MOOD,
        lastSeen: now,
        awayUntil: null,
        lastFedAt: state.lastFedAt,
        task: state.task,
      }
    }
    return state
  }

  const hours = (now - state.lastSeen) / HOUR_MS
  const mood = Math.min(MOOD_MAX, Math.max(MOOD_MIN, state.mood - hours * decayRate(state)))

  if (mood <= MOOD_MIN) {
    return {
      mood: MOOD_MIN,
      lastSeen: now,
      awayUntil: now + AWAY_DURATION_MS,
      lastFedAt: state.lastFedAt,
      task: state.task,
    }
  }

  return { mood, lastSeen: state.lastSeen, awayUntil: null, lastFedAt: state.lastFedAt, task: state.task }
}

export function feedCooldownRemaining(state: TamagotchiState, now: number): number | null {
  if (state.awayUntil !== null || state.lastFedAt === null) {
    return null
  }
  const remaining = state.lastFedAt + FEED_COOLDOWN_MS - now
  return remaining > 0 ? remaining : null
}

export function canFeed(state: TamagotchiState, now: number): boolean {
  if (state.awayUntil !== null) {
    return false
  }
  return feedCooldownRemaining(state, now) === null
}

export function feed(state: TamagotchiState, now: number): TamagotchiState {
  return {
    mood: state.mood >= FEED_CAP ? state.mood : Math.min(FEED_CAP, state.mood + FEED_GAIN),
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: now,
    task: state.task,
  }
}

export function startTask(
  state: TamagotchiState,
  input: { hours: number; description: string },
  now: number,
): TamagotchiState {
  const hours = Math.min(TASK_MAX_HOURS, Math.max(TASK_MIN_HOURS, Math.round(input.hours)))
  const mood = Math.min(MOOD_MAX, Math.max(state.mood, TASK_MOOD_BASE + TASK_MOOD_PER_HOUR * hours))
  return {
    mood,
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: state.lastFedAt,
    task: {
      description: input.description.trim(),
      hours,
      startedAt: now,
      deadline: now + hours * HOUR_MS,
      extensions: 0,
    },
  }
}

export function completeTask(state: TamagotchiState, now: number): TamagotchiState {
  return { ...state, lastSeen: now, task: null }
}

export function extendTask(state: TamagotchiState, now: number): TamagotchiState {
  if (state.task === null) {
    return state
  }
  return {
    ...state,
    lastSeen: now,
    task: {
      ...state.task,
      deadline: state.task.deadline + EXTENSION_MS,
      extensions: state.task.extensions + 1,
    },
  }
}

export function abandonTask(state: TamagotchiState, now: number): TamagotchiState {
  return { ...state, mood: 0, lastSeen: now, task: null }
}

export function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  if (minutes < 1) {
    return 'меньше минуты'
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return `${rest} мин`
  }
  return `${hours} ч ${rest} мин`
}
