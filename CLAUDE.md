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
| 開発サーバ | `mise run dev` |
| 本番ビルド（`dist/`） | `mise run build` |
| ビルドのプレビュー | `mise run preview` |
| 型チェック（svelte-check + tsc） | `mise run check` |
| テスト（vitest） | `mise run test` |
| 単一テスト | `mise exec -- pnpm vitest run src/lib/foo.test.ts -t "テスト名"` |
| タイマー音の再生成 | `mise run sounds` |

リンター/フォーマッターは未導入。変更後は `mise run check` と `mise run test` を通すこと。

## タイマー音

`scripts/gen-sounds.sh` が ffmpeg で `public/sounds/` に mp3 を生成する（生成物もコミット対象）。

- `warn.mp3`: 残り 15/10/5 秒の予告音（880Hz 短音）
- `end.mp3`: 時間到達音（1320Hz の 3 連音）

音を変える場合はスクリプトを編集して再生成する。mp3 を手で差し替えない。

## 実装上の注意

- 残り時間は `setInterval` のカウント加算ではなく、開始時刻（`performance.now()` / `Date.now()`）との差分から算出する。バックグラウンドタブではタイマーが間引かれるため、加算方式だとずれる。
- ブラウザの自動再生制限があるため、音声（`HTMLAudioElement` / Web Audio の `AudioContext`）はスタートボタン等のユーザー操作時にアンロックしておく。
- 時間計算などの純粋ロジックは `src/lib/` の `.ts` に分離し、vitest でテストする（`*.test.ts` を同階層に置く）。
