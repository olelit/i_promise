export interface TamagotchiState {
  mood: number
  lastSeen: number
  awayUntil: number | null
  lastFedAt: number | null
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

const HOUR_MS = 3_600_000

export function createInitialState(now: number): TamagotchiState {
  return { mood: INITIAL_MOOD, lastSeen: now, awayUntil: null, lastFedAt: null }
}

export function applyDecay(state: TamagotchiState, now: number): TamagotchiState {
  if (state.awayUntil !== null) {
    if (now >= state.awayUntil) {
      return { mood: RETURN_MOOD, lastSeen: now, awayUntil: null, lastFedAt: state.lastFedAt }
    }
    return state
  }

  const hours = (now - state.lastSeen) / HOUR_MS
  const mood = Math.min(MOOD_MAX, Math.max(MOOD_MIN, state.mood - hours * DECAY_PER_HOUR))

  if (mood <= MOOD_MIN) {
    return {
      mood: MOOD_MIN,
      lastSeen: now,
      awayUntil: now + AWAY_DURATION_MS,
      lastFedAt: state.lastFedAt,
    }
  }

  return { mood, lastSeen: state.lastSeen, awayUntil: null, lastFedAt: state.lastFedAt }
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
    mood: Math.min(FEED_CAP, state.mood + FEED_GAIN),
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: now,
  }
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
