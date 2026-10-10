<script lang="ts">
  import { loadSettings, saveSettings } from './lib/settings'
  import { SoundPlayer } from './lib/sound'
  import {
    elapsedMs,
    firstLapMs,
    formatTime,
    soundEventsBetween,
    timerView,
    WARN_MARKS_SEC,
    type TimerState,
  } from './lib/timer'
  import { WakeLock } from './lib/wakeLock'

  /** 画面更新の間隔 */
  const TICK_MS = 200
  /** どれだけ先まで音を予約しておくか。バックグラウンドで tick が大きく遅れても鳴るよう長めに取る */
  const SCHEDULE_HORIZON_MS = 5 * 60_000

  const sound = new SoundPlayer()
  const wakeLock = new WakeLock()

  let settings = $state(loadSettings())
  let timer = $state<TimerState>({ status: 'idle' })
  let now = $state(Date.now())
  /** この時刻までの音は予約済み */
  let scheduledUntil = 0

  const clampInt = (v: unknown, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0

  const toMs = (minutes: unknown, seconds: unknown) =>
    (clampInt(minutes, 999) * 60 + clampInt(seconds, 59)) * 1000

  const durationMs = $derived(toMs(settings.minutes, settings.seconds))
  // 最初のラップの別設定は繰り返し時のみ意味を持つ
  const useFirstLap = $derived(settings.repeat && settings.firstLap)
  const config = $derived({
    durationMs,
    firstLapMs: useFirstLap ? toMs(settings.firstMinutes, settings.firstSeconds) : undefined,
    repeat: settings.repeat,
  })
  const canStart = $derived(durationMs > 0 && firstLapMs(config) > 0)
  const view = $derived(timerView(config, timer, now))
  const active = $derived(timer.status === 'running' || timer.status === 'paused')
  const warning = $derived(active && view.remainingMs <= WARN_MARKS_SEC[0] * 1000)
  const progress = $derived(view.lapMs > 0 ? 1 - view.remainingMs / view.lapMs : 0)

  $effect(() => saveSettings($state.snapshot(settings)))

  $effect(() => {
    document.title = active ? `${formatTime(view.remainingMs)} - Interval Timer` : 'Interval Timer'
  })

  $effect(() => {
    const id = setInterval(tick, TICK_MS)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  })

  function tick() {
    now = Date.now()
    if (timer.status !== 'running') return
    if (timerView(config, timer, now).finished) {
      timer = { status: 'finished' }
      void wakeLock.release()
      return
    }
    scheduleSounds()
  }

  function scheduleSounds() {
    if (timer.status !== 'running') return
    const to = Date.now() + SCHEDULE_HORIZON_MS
    for (const e of soundEventsBetween(config, timer.startedAt, scheduledUntil, to)) {
      sound.schedule(e.sound, e.at)
    }
    scheduledUntil = to
  }

  async function start() {
    if (!canStart || timer.status === 'running') return
    const elapsed = elapsedMs(timer, Date.now())
    try {
      await sound.unlock()
    } catch (e) {
      console.error('音声の初期化に失敗しました', e)
    }
    sound.cancelAll()
    const t = Date.now()
    timer = { status: 'running', startedAt: t - elapsed }
    scheduledUntil = t
    now = t
    scheduleSounds()
    void wakeLock.request()
  }

  function pause() {
    if (timer.status !== 'running') return
    timer = { status: 'paused', elapsedMs: elapsedMs(timer, Date.now()) }
    sound.cancelAll()
    void wakeLock.release()
  }

  function reset() {
    timer = { status: 'idle' }
    sound.cancelAll()
    void wakeLock.release()
  }
</script>

<main class:warning class:finished={view.finished}>
  <h1>Interval Timer</h1>

  <div class="display" aria-live="off">
    <div class="time">{formatTime(view.remainingMs)}</div>
    <div class="sub">
      {#if view.finished}
        時間です
      {:else if settings.repeat && active}
        ラップ {view.lap}
      {:else}
        &nbsp;
      {/if}
    </div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)}>
      <div class="fill" style:width="{progress * 100}%"></div>
    </div>
  </div>

  <div class="controls">
    {#if timer.status === 'running'}
      <button class="primary" onclick={pause}>一時停止</button>
    {:else if timer.status === 'paused'}
      <button class="primary" onclick={start}>再開</button>
    {:else}
      <button class="primary" onclick={start} disabled={!canStart}>スタート</button>
    {/if}
    <button onclick={reset} disabled={timer.status === 'idle'}>リセット</button>
  </div>

  <fieldset class="settings" disabled={active}>
    <div class="row">
      <span class="label">インターバル</span>
      <label>
        <input type="number" inputmode="numeric" min="0" max="999" bind:value={settings.minutes} />
        分
      </label>
      <label>
        <input type="number" inputmode="numeric" min="0" max="59" bind:value={settings.seconds} />
        秒
      </label>
    </div>
    <div class="row">
      <label>
        <input type="checkbox" bind:checked={settings.repeat} />
        繰り返す
      </label>
    </div>
    {#if settings.repeat}
      <div class="row">
        <label class="label">
          <input type="checkbox" bind:checked={settings.firstLap} />
          最初のラップ
        </label>
        <label>
          <input
            type="number"
            inputmode="numeric"
            min="0"
            max="999"
            disabled={!settings.firstLap}
            bind:value={settings.firstMinutes}
          />
          分
        </label>
        <label>
          <input
            type="number"
            inputmode="numeric"
            min="0"
            max="59"
            disabled={!settings.firstLap}
            bind:value={settings.firstSeconds}
          />
          秒
        </label>
      </div>
    {/if}
  </fieldset>

  <p class="note">残り {WARN_MARKS_SEC.join('・')} 秒と時間到達時に音が鳴ります</p>
</main>

<style>
  main {
    --accent: #2563eb;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem 1rem;
    width: min(100%, 32rem);
    box-sizing: border-box;
  }

  main.warning {
    --accent: #ea580c;
  }

  main.finished {
    --accent: #dc2626;
  }

  h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    opacity: 0.7;
  }

  .display {
    width: 100%;
    text-align: center;
  }

  .time {
    font-size: clamp(4rem, 22vw, 8rem);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    color: var(--accent);
    transition: color 0.3s;
  }

  .sub {
    margin-top: 0.5rem;
    min-height: 1.5em;
    opacity: 0.8;
  }

  .bar {
    margin-top: 1rem;
    height: 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 12%, transparent);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    transition: background 0.3s;
  }

  .controls {
    display: flex;
    gap: 1rem;
  }

  button {
    font: inherit;
    font-size: 1.125rem;
    padding: 0.75rem 1.75rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
    min-width: 8rem;
  }

  button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .settings {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    border: none;
    margin: 0;
    padding: 0;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
  }

  .label {
    min-width: 9rem;
    text-align: right;
  }

  input:disabled {
    opacity: 0.5;
  }

  .settings:disabled {
    opacity: 0.5;
  }

  .settings input[type='number'] {
    font: inherit;
    font-size: 1.25rem;
    width: 4.5rem;
    padding: 0.4rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .note {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.6;
  }
</style>
