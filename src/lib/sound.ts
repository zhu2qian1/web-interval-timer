// Web Audio API による効果音の予約再生。
// AudioContext の時計はバックグラウンドタブでも JS タイマーのように間引かれないため、
// 鳴らす時刻が分かっている音は先に start(when) で予約しておく。

import type { SoundKind } from './timer'

const SOUND_URLS: Record<SoundKind, string> = {
  warn: `${import.meta.env.BASE_URL}sounds/warn.mp3`,
  end: `${import.meta.env.BASE_URL}sounds/end.mp3`,
}

/** これより古い（遅れた）予約は鳴らさずに捨てる */
const LATE_TOLERANCE_MS = 1000

export class SoundPlayer {
  private ctx: AudioContext | null = null
  private buffers = new Map<SoundKind, AudioBuffer>()
  private loading: Promise<void> | null = null
  private sources = new Set<AudioBufferSourceNode>()

  /** ユーザー操作のハンドラ内で呼ぶこと（自動再生制限の解除） */
  async unlock(): Promise<void> {
    this.ctx ??= new AudioContext()
    const resumed = this.ctx.state === 'suspended' ? this.ctx.resume() : Promise.resolve()
    this.loading ??= this.load(this.ctx)
    await Promise.all([resumed, this.loading])
  }

  private async load(ctx: AudioContext): Promise<void> {
    await Promise.all(
      (Object.keys(SOUND_URLS) as SoundKind[]).map(async (kind) => {
        const res = await fetch(SOUND_URLS[kind])
        this.buffers.set(kind, await ctx.decodeAudioData(await res.arrayBuffer()))
      }),
    )
  }

  /** epoch ms で指定した時刻に再生を予約する */
  schedule(kind: SoundKind, at: number): void {
    const ctx = this.ctx
    const buffer = this.buffers.get(kind)
    if (!ctx || !buffer) return

    const delayMs = at - Date.now()
    if (delayMs < -LATE_TOLERANCE_MS) return

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => this.sources.delete(source)
    source.start(ctx.currentTime + Math.max(0, delayMs) / 1000)
    this.sources.add(source)
  }

  play(kind: SoundKind): void {
    this.schedule(kind, Date.now())
  }

  cancelAll(): void {
    for (const source of this.sources) {
      source.onended = null
      source.stop()
    }
    this.sources.clear()
  }
}
