import { describe, expect, it } from 'vitest'
import { cycleOffsets, formatTime, soundEventsBetween, timerView, type TimerConfig } from './timer'

const MIN = 60_000

describe('timerView', () => {
  const once: TimerConfig = { durationMs: MIN, repeat: false }
  const loop: TimerConfig = { durationMs: MIN, repeat: true }

  it('idle では設定時間をそのまま返す', () => {
    expect(timerView(once, { status: 'idle' }, 0)).toEqual({ remainingMs: MIN, cycle: 1, finished: false })
  })

  it('running では開始時刻との差分から残りを計算する', () => {
    expect(timerView(once, { status: 'running', startedAt: 1000 }, 21_000).remainingMs).toBe(40_000)
  })

  it('paused では経過時間を保持する', () => {
    expect(timerView(once, { status: 'paused', elapsedMs: 15_000 }, 999_999).remainingMs).toBe(45_000)
  })

  it('繰り返しなしで時間を過ぎたら finished', () => {
    expect(timerView(once, { status: 'running', startedAt: 0 }, MIN).finished).toBe(true)
  })

  it('繰り返しありではサイクルが進む', () => {
    expect(timerView(loop, { status: 'running', startedAt: 0 }, MIN * 2 + 10_000)).toEqual({
      remainingMs: 50_000,
      cycle: 3,
      finished: false,
    })
  })
})

describe('cycleOffsets', () => {
  it('15/10/5 秒前と終了時に鳴る', () => {
    expect(cycleOffsets(MIN)).toEqual([
      { at: 45_000, sound: 'warn' },
      { at: 50_000, sound: 'warn' },
      { at: 55_000, sound: 'warn' },
      { at: 60_000, sound: 'end' },
    ])
  })

  it('設定時間以上の予告は鳴らさない', () => {
    expect(cycleOffsets(10_000)).toEqual([
      { at: 5_000, sound: 'warn' },
      { at: 10_000, sound: 'end' },
    ])
  })
})

describe('soundEventsBetween', () => {
  it('区間 (from, to] の音だけを返す', () => {
    const cfg: TimerConfig = { durationMs: MIN, repeat: false }
    expect(soundEventsBetween(cfg, 0, 45_000, 55_000).map((e) => e.at)).toEqual([50_000, 55_000])
  })

  it('繰り返しなしでは次のサイクルの音を返さない', () => {
    const cfg: TimerConfig = { durationMs: MIN, repeat: false }
    expect(soundEventsBetween(cfg, 0, 0, MIN * 3)).toHaveLength(4)
  })

  it('繰り返しありでは複数サイクルにまたがる', () => {
    const cfg: TimerConfig = { durationMs: 20_000, repeat: true }
    expect(soundEventsBetween(cfg, 1000, 1000, 41_000)).toEqual([
      { at: 6_000, sound: 'warn' },
      { at: 11_000, sound: 'warn' },
      { at: 16_000, sound: 'warn' },
      { at: 21_000, sound: 'end' },
      { at: 26_000, sound: 'warn' },
      { at: 31_000, sound: 'warn' },
      { at: 36_000, sound: 'warn' },
      { at: 41_000, sound: 'end' },
    ])
  })
})

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [300, '00:01'],
    [59_001, '01:00'],
    [5 * MIN, '05:00'],
    [61 * MIN, '1:01:00'],
  ])('%i ms -> %s', (ms, expected) => {
    expect(formatTime(ms)).toBe(expected)
  })
})
