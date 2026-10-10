// ユーザー設定の localStorage 永続化

export interface Settings {
  minutes: number
  seconds: number
  repeat: boolean
  /** 最初のラップだけ別の長さにするか（repeat 時のみ有効） */
  firstLap: boolean
  firstMinutes: number
  firstSeconds: number
}

const STORAGE_KEY = 'web-interval-timer:settings'

export const DEFAULT_SETTINGS: Settings = {
  minutes: 3,
  seconds: 0,
  repeat: false,
  firstLap: false,
  firstMinutes: 3,
  firstSeconds: 0,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const settings = { ...DEFAULT_SETTINGS }
    // 型が既定値と一致する項目だけ採用する（古い保存形式や壊れた値への備え）
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (typeof parsed[key] === typeof DEFAULT_SETTINGS[key]) {
        ;(settings as Record<string, unknown>)[key] = parsed[key]
      }
    }
    return settings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // プライベートモード等で保存できなくても動作は継続する
  }
}
