// ユーザー設定の localStorage 永続化

export interface Settings {
  minutes: number
  seconds: number
  repeat: boolean
}

const STORAGE_KEY = 'web-interval-timer:settings'

export const DEFAULT_SETTINGS: Settings = { minutes: 3, seconds: 0, repeat: false }

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      minutes: typeof parsed.minutes === 'number' ? parsed.minutes : DEFAULT_SETTINGS.minutes,
      seconds: typeof parsed.seconds === 'number' ? parsed.seconds : DEFAULT_SETTINGS.seconds,
      repeat: typeof parsed.repeat === 'boolean' ? parsed.repeat : DEFAULT_SETTINGS.repeat,
    }
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
