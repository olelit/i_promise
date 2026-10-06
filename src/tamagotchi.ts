export interface TamagotchiTask {
  description: string
  hours: number
  startedAt: number
  deadline: number
  extensions: number
}

export type TaskStatus = 'done' | 'abandoned' | 'overdue'

export interface TaskRecord {
  description: string
  hours: number
  startedAt: number
  finishedAt: number
  status: TaskStatus
}

export type SkinId = 'classic' | 'sky' | 'rose'

export const SKIN_IDS: readonly SkinId[] = ['classic', 'sky', 'rose']

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value)
}

export interface TamagotchiState {
  mood: number
  clockOffset: number
  lastSeen: number
  awayUntil: number | null
  lastFedAt: number | null
  task: TamagotchiTask | null
  skin: SkinId
  rulesSent: boolean
  history: TaskRecord[]
}

export const MOOD_MAX = 100
export const MOOD_MIN = -100
export const INITIAL_MOOD = 100
export const DECAY_PER_HOUR = 20
export const AWAY_DURATION_MS = 2 * 3_600_000
export const RETURN_MOOD = -50
export const TICK_MS = 60_000
export const FAST_TICK_MS = 1_000
export const TIME_SPEEDS = [0, 1, 60, 600] as const
export type TimeSpeed = (typeof TIME_SPEEDS)[number]
export const DEFAULT_TIME_SPEED: TimeSpeed = 1
export const FEED_GAIN = 20
export const FEED_CAP = 20
export const FEED_COOLDOWN_MS = 24 * 3_600_000
export const TASK_MIN_HOURS = 1
export const TASK_MAX_HOURS = 12
export const TASK_MOOD_BASE = 20
export const TASK_MOOD_PER_HOUR = 10
export const TASK_DESCRIPTION_MAX = 120
export const EXTENSION_MS = 3_600_000
export const HISTORY_MAX = 20
export const TASK_MILESTONE_FRACTION = [0.5, 0.25]
export const TASK_MILESTONE_SOON_MS = 600_000

const HOUR_MS = 3_600_000

export function advanceClockOffset(
  offset: number,
  realDelta: number,
  speed: TimeSpeed,
): number {
  return offset + realDelta * (speed - 1)
}

export function createInitialState(now: number): TamagotchiState {
  return {
    mood: INITIAL_MOOD,
    clockOffset: 0,
    lastSeen: now,
    awayUntil: null,
    lastFedAt: null,
    task: null,
    skin: 'classic',
    rulesSent: false,
    history: [],
  }
}

function taskRecord(task: TamagotchiTask, finishedAt: number, status: TaskStatus): TaskRecord {
  return {
    description: task.description,
    hours: task.hours,
    startedAt: task.startedAt,
    finishedAt,
    status,
  }
}

function withRecord(state: TamagotchiState, record: TaskRecord): TaskRecord[] {
  return [record, ...state.history].slice(0, HISTORY_MAX)
}

export interface TaskTiming {
  elapsed: number
  total: number
  remaining: number
  overdue: number
}

export function taskTiming(task: TamagotchiTask, now: number): TaskTiming {
  const total = Math.max(0, task.deadline - task.startedAt)
  const elapsed = Math.min(total, Math.max(0, now - task.startedAt))
  const remaining = Math.max(0, task.deadline - now)
  const overdue = Math.max(0, now - task.deadline)
  return { elapsed, total, remaining, overdue }
}

function decayRate(state: TamagotchiState): number {
  if (state.task === null) {
    return DECAY_PER_HOUR
  }
  return DECAY_PER_HOUR * 2 ** state.task.extensions
}

export function applyDecay(state: TamagotchiState, now: number): TamagotchiState {
  if (state.task !== null && now >= state.task.deadline) {
    return {
      mood: 0,
      clockOffset: state.clockOffset,
      lastSeen: now,
      awayUntil: null,
      lastFedAt: state.lastFedAt,
      task: null,
      skin: state.skin,
      rulesSent: state.rulesSent,
      history: withRecord(state, taskRecord(state.task, state.task.deadline, 'overdue')),
    }
  }

  if (state.awayUntil !== null) {
    if (now >= state.awayUntil) {
      return {
        mood: RETURN_MOOD,
        clockOffset: state.clockOffset,
        lastSeen: now,
        awayUntil: null,
        lastFedAt: state.lastFedAt,
        task: state.task,
        skin: state.skin,
        rulesSent: state.rulesSent,
        history: state.history,
      }
    }
    return state
  }

  const hours = Math.max(0, (now - state.lastSeen) / HOUR_MS)
  const mood = Math.min(MOOD_MAX, Math.max(MOOD_MIN, state.mood - hours * decayRate(state)))

  if (mood <= MOOD_MIN) {
    return {
      mood: MOOD_MIN,
      clockOffset: state.clockOffset,
      lastSeen: now,
      awayUntil: now + AWAY_DURATION_MS,
      lastFedAt: state.lastFedAt,
      task: state.task,
      skin: state.skin,
      rulesSent: state.rulesSent,
      history: state.history,
    }
  }

  return {
    mood,
    clockOffset: state.clockOffset,
    lastSeen: state.lastSeen,
    awayUntil: null,
    lastFedAt: state.lastFedAt,
    task: state.task,
    skin: state.skin,
    rulesSent: state.rulesSent,
    history: state.history,
  }
}

export function feedCooldownRemaining(state: TamagotchiState, now: number): number | null {
  if (state.awayUntil !== null || state.lastFedAt === null) {
    return null
  }
  const remaining = state.lastFedAt + FEED_COOLDOWN_MS - now
  return remaining > 0 ? remaining : null
}

export type FeedBlockReason = 'away' | 'cooldown' | 'full'

export function feedBlockReason(state: TamagotchiState, now: number): FeedBlockReason | null {
  if (state.awayUntil !== null) {
    return 'away'
  }
  if (feedCooldownRemaining(state, now) !== null) {
    return 'cooldown'
  }
  if (state.mood >= FEED_CAP) {
    return 'full'
  }
  return null
}

export function canFeed(state: TamagotchiState, now: number): boolean {
  return feedBlockReason(state, now) === null
}

export function feed(state: TamagotchiState, now: number): TamagotchiState {
  return {
    mood: state.mood >= FEED_CAP ? state.mood : Math.min(FEED_CAP, state.mood + FEED_GAIN),
    clockOffset: state.clockOffset,
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: now,
    task: state.task,
    skin: state.skin,
    rulesSent: state.rulesSent,
    history: state.history,
  }
}

export function startTask(
  state: TamagotchiState,
  input: { hours: number; description: string },
  now: number,
): TamagotchiState {
  if (state.task !== null) {
    return state
  }
  const hours = Math.min(TASK_MAX_HOURS, Math.max(TASK_MIN_HOURS, Math.round(input.hours)))
  const mood = Math.min(MOOD_MAX, Math.max(state.mood, TASK_MOOD_BASE + TASK_MOOD_PER_HOUR * hours))
  return {
    mood,
    clockOffset: state.clockOffset,
    lastSeen: now,
    awayUntil: null,
    lastFedAt: state.lastFedAt,
    task: {
      description: input.description.trim(),
      hours,
      startedAt: now,
      deadline: now + hours * HOUR_MS,
      extensions: 0,
    },
    skin: state.skin,
    rulesSent: state.rulesSent,
    history: state.history,
  }
}

export function completeTask(state: TamagotchiState, now: number): TamagotchiState {
  if (state.task === null) {
    return state
  }
  return {
    ...state,
    lastSeen: now,
    task: null,
    history: withRecord(state, taskRecord(state.task, now, 'done')),
  }
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
  if (state.task === null) {
    return state
  }
  return {
    ...state,
    mood: 0,
    lastSeen: now,
    task: null,
    history: withRecord(state, taskRecord(state.task, now, 'abandoned')),
  }
}
