#!/usr/bin/env bash
# タイマー音を ffmpeg で生成して public/sounds/ に出力する。
#   warn.mp3 : 残り 15/10/5 秒の予告音（短いビープ）
#   end.mp3  : 時間到達音（長めの 3 連ビープ）
set -euo pipefail

cd "$(dirname "$0")/.."
out=public/sounds
mkdir -p "$out"

ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# 880Hz / 0.15s。前後に短いフェードを入れてクリックノイズを防ぐ
ff -f lavfi -i "sine=frequency=880:duration=0.15" \
  -af "afade=t=in:d=0.01,afade=t=out:st=0.12:d=0.03,volume=0.8" \
  -ac 1 -ar 44100 -c:a libmp3lame -q:a 4 "$out/warn.mp3"

# 1320Hz の 0.25s ビープ + 0.1s 無音 を 3 回
ff -f lavfi -i "sine=frequency=1320:duration=0.25" \
  -af "afade=t=in:d=0.01,afade=t=out:st=0.2:d=0.05,apad=pad_dur=0.1,aloop=loop=2:size=15435,volume=0.8" \
  -ac 1 -ar 44100 -c:a libmp3lame -q:a 4 "$out/end.mp3"

ls -l "$out"
