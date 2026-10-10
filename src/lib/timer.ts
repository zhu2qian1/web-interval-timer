// タイマーの時間計算（純粋関数）。時刻はすべて Date.now() 基準の epoch ms。

export type SoundKind = 'warn' | 'end'

/** 予告音を鳴らす残り秒数 */
export const WARN_MARKS_SEC = [15, 10, 5] as const

export interface TimerConfig {
  /** 1 ラップ（インターバル）の長さ */
  durationMs: number
  /** 最初のラップだけ長さを変える場合に指定。省略時は durationMs */
  firstLapMs?: number
  /** 時間到達後に自動で次のラップを始めるか。false なら最初のラップだけで終了 */
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
  /** 現在のラップの長さ */
  lapMs: number
  /** 1 始まりのラップ番号 */
  lap: number
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

export function firstLapMs(config: TimerConfig): number {
  return config.firstLapMs ?? config.durationMs
}

export function timerView(config: TimerConfig, state: TimerState, now: number): TimerView {
  const d = config.durationMs
  const first = firstLapMs(config)
  if (state.status === 'finished') return { remainingMs: 0, lapMs: first, lap: 1, finished: true }
  if (state.status === 'idle' || d <= 0 || first <= 0) {
    return { remainingMs: first, lapMs: first, lap: 1, finished: false }
  }

  const elapsed = elapsedMs(state, now)
  if (elapsed < first) return { remainingMs: first - elapsed, lapMs: first, lap: 1, finished: false }
  if (!config.repeat) return { remainingMs: 0, lapMs: first, lap: 1, finished: true }

  // 2 ラップ目以降は長さ d で繰り返す
  const after = elapsed - first
  return { remainingMs: d - (after % d), lapMs: d, lap: Math.floor(after / d) + 2, finished: false }
}

/** 1 ラップ内での音のオフセット（ラップ開始からの ms）。開始直後と同時刻の予告音は除く */
export function lapOffsets(lapMs: number): SoundEvent[] {
  const events: SoundEvent[] = WARN_MARKS_SEC.map((s) => lapMs - s * 1000)
    .filter((offset) => offset > 0)
    .map((offset) => ({ at: offset, sound: 'warn' as const }))
  events.push({ at: lapMs, sound: 'end' })
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
  const first = firstLapMs(config)
  if (d <= 0 || first <= 0 || to <= from) return []

  const events: SoundEvent[] = []
  const push = (lapStart: number, offsets: SoundEvent[]) => {
    for (const o of offsets) {
      const at = lapStart + o.at
      if (at > from && at <= to) events.push({ at, sound: o.sound })
    }
  }

  push(startedAt, lapOffsets(first))
  if (!config.repeat) return events

  // 2 ラップ目以降。k はその中での 0 始まりの番号
  const base = startedAt + first
  const offsets = lapOffsets(d)
  const firstK = Math.max(0, Math.floor((from - base) / d))
  const lastK = Math.floor((to - base) / d)
  for (let k = firstK; k <= lastK; k++) push(base + k * d, offsets)
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
