// タイマーの時間計算（純粋関数）。時刻はすべて Date.now() 基準の epoch ms。

export type SoundKind = 'warn' | 'end'

/** 予告音を鳴らす残り秒数 */
export const WARN_MARKS_SEC = [15, 10, 5] as const

export interface TimerConfig {
  durationMs: number
  /** 時間到達後に自動で次のサイクルを始めるか */
  repeat: boolean
}

export type TimerState =
  | { status: 'idle' }
  // startedAt は一時停止分を差し引いた仮想的な開始時刻（now - 経過時間）
  | { status: 'running'; startedAt: number }
  | { status: 'paused'; elapsedMs: number }
  | { status: 'finished' }

export interface TimerView {
  remainingMs: number
  /** 1 始まりのサイクル番号 */
  cycle: number
  finished: boolean
}

export interface SoundEvent {
  at: number
  sound: SoundKind
}

export function elapsedMs(state: TimerState, now: number): number {
  switch (state.status) {
    case 'running':
      return Math.max(0, now - state.startedAt)
    case 'paused':
      return state.elapsedMs
    default:
      return 0
  }
}

export function timerView(config: TimerConfig, state: TimerState, now: number): TimerView {
  const d = config.durationMs
  if (state.status === 'finished') return { remainingMs: 0, cycle: 1, finished: true }
  if (state.status === 'idle' || d <= 0) return { remainingMs: d, cycle: 1, finished: false }

  const elapsed = elapsedMs(state, now)
  if (!config.repeat) {
    return elapsed >= d
      ? { remainingMs: 0, cycle: 1, finished: true }
      : { remainingMs: d - elapsed, cycle: 1, finished: false }
  }
  const cycleIndex = Math.floor(elapsed / d)
  return { remainingMs: d - (elapsed % d), cycle: cycleIndex + 1, finished: false }
}

/** 1 サイクル内での音のオフセット（サイクル開始からの ms）。開始直後と同時刻の予告音は除く */
export function cycleOffsets(durationMs: number): SoundEvent[] {
  const events: SoundEvent[] = WARN_MARKS_SEC.map((s) => durationMs - s * 1000)
    .filter((offset) => offset > 0)
    .map((offset) => ({ at: offset, sound: 'warn' as const }))
  events.push({ at: durationMs, sound: 'end' })
  return events.sort((a, b) => a.at - b.at)
}

/** startedAt に開始したタイマーで、時刻 (from, to] に鳴る音を列挙する */
export function soundEventsBetween(
  config: TimerConfig,
  startedAt: number,
  from: number,
  to: number,
): SoundEvent[] {
  const d = config.durationMs
  if (d <= 0 || to <= from) return []

  const offsets = cycleOffsets(d)
  const firstCycle = Math.max(0, Math.floor((from - startedAt) / d))
  const lastCycle = config.repeat ? Math.floor((to - startedAt) / d) : 0

  const events: SoundEvent[] = []
  for (let k = firstCycle; k <= lastCycle; k++) {
    for (const o of offsets) {
      const at = startedAt + k * d + o.at
      if (at > from && at <= to) events.push({ at, sound: o.sound })
    }
  }
  return events
}

/** 残り時間を表示用に整形する。秒は切り上げ（残り 0.3 秒は "00:01"） */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}
