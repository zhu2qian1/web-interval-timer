// タイマー動作中に画面がスリープしないよう Screen Wake Lock を取得する。
// 非対応ブラウザでは何もしない。タブが非表示になると自動で解放されるため、再表示時に取り直す。

export class WakeLock {
  private sentinel: WakeLockSentinel | null = null
  private wanted = false

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') void this.acquire()
    })
  }

  async request(): Promise<void> {
    this.wanted = true
    await this.acquire()
  }

  async release(): Promise<void> {
    this.wanted = false
    const s = this.sentinel
    this.sentinel = null
    await s?.release().catch(() => {})
  }

  private async acquire(): Promise<void> {
    if (!('wakeLock' in navigator) || (this.sentinel && !this.sentinel.released)) return
    try {
      this.sentinel = await navigator.wakeLock.request('screen')
    } catch {
      // 省電力モード等で拒否された場合は諦める
    }
  }
}
