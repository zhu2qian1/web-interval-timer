# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

任意の分数を設定できる Web インターバルタイマー。残り 15 秒・10 秒・5 秒と時間到達時に音を鳴らす。

- **フロントエンドのみ**。バックエンドサーバは作らない。永続化が必要なら `localStorage` などブラウザ側ストレージを使う。
- フレームワークは **Svelte 5 + Vite + TypeScript**（SvelteKit ではなく素の Vite SPA）。Svelte 5 の runes（`$state` / `$derived` / `$effect`）で書く。
- 将来 **PWA** としてインストール可能にする予定（`vite-plugin-pwa` 想定）。独自ドメインはユーザーが保有しており、デプロイ時に指示がある。PWA 化の際はアイコン・manifest・Service Worker での `public/sounds/` のプリキャッシュが必要。

## 開発環境・コマンド

ツールは mise で管理（`mise.toml`: Node 24 / pnpm 12）。初回は `mise install && mise run install`。

| 用途 | コマンド |
| --- | --- |
| 開発サーバ | `mise run dev`（ツール・依存の導入込みなら `scripts/dev.sh`、LAN 公開は `scripts/dev.sh --host`） |
| 本番ビルド（`dist/`） | `mise run build` |
| ビルドのプレビュー | `mise run preview` |
| 型チェック（svelte-check + tsc） | `mise run check` |
| テスト（vitest） | `mise run test` |
| 単一テスト | `mise exec -- pnpm vitest run src/lib/foo.test.ts -t "テスト名"` |
| タイマー音の再生成 | `mise run sounds` |

リンター/フォーマッターは未導入。変更後は `mise run check` と `mise run test` を通すこと。

## デプロイ

`main` への push で `.github/workflows/deploy.yml` が check・test・build を行い GitHub Pages に公開する。ビルド時の `base` は `actions/configure-pages` の `base_path` から渡す（`*.github.io/web-interval-timer/` 配信なら `/web-interval-timer/`、独自ドメイン設定後は `/`）。そのため、コードから `public/` のファイルを参照するときは URL をルート固定（`/foo`）で書かず、`import.meta.env.BASE_URL` を前置すること。

## タイマー音

`scripts/gen-sounds.sh` が ffmpeg で `public/sounds/` に mp3 を生成する（生成物もコミット対象）。

- `warn.mp3`: 残り 15/10 秒と 5〜1 秒の予告音（440Hz の短音）
- `end.mp3`: 時間到達音（880Hz・2s。時報のように `curve=par` で減衰させる）

音を変える場合はスクリプトを編集して再生成する。mp3 を手で差し替えない。

## アーキテクチャ

状態とイベントループは `src/App.svelte` が持ち、副作用のないロジックとブラウザ API のラッパーは `src/lib/` に分けている。

- `timer.ts`: 純粋関数のみ（vitest の対象）。`TimerState` は `idle | running | paused | finished`。`running` の `startedAt` は一時停止分を差し引いた仮想的な開始時刻なので、経過時間は常に `now - startedAt` で求まる。ラップ 1 だけ長さを `firstLapMs` で変えられ、2 ラップ目以降は `durationMs` で繰り返す（`repeat: false` ならラップ 1 で終了）。音を鳴らす時刻は `soundEventsBetween()` で、区間 `(from, to]` に入る分だけ列挙する。
- `sound.ts`: Web Audio で音を**事前予約**する（`AudioBufferSourceNode.start(when)`）。バックグラウンドタブでは JS のタイマーが最大 1 分程度間引かれるが、AudioContext の時計は間引かれないため。`unlock()` は自動再生制限を解除するため、ユーザー操作のハンドラ内で呼ぶ必要がある。
- `App.svelte`: 200ms ごとの tick で表示を更新し、`scheduledUntil` から `now + 5分` までの音を予約していく。一時停止とリセットでは `cancelAll()` で予約を破棄し、再開時に予約し直す。
- `settings.ts`（分・秒・繰り返しを localStorage に保存）と `wakeLock.ts`（動作中の画面スリープを防止）。

残り時間は必ず時刻の差分から算出し、tick ごとにカウンタを加算する方式にはしない。時間計算のロジックを追加するときは `timer.ts` に置き、`timer.test.ts` でテストする。
