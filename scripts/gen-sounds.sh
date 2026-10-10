#!/usr/bin/env bash
# タイマー音を ffmpeg で生成して public/sounds/ に出力する。
#   warn.mp3 : 残り 15/10 秒と 5〜1 秒の予告音（440Hz の短いビープ）
#   end.mp3  : 時間到達音（880Hz・2s の減衰するロングビープ 1 回）
set -euo pipefail

cd "$(dirname "$0")/.."
out=public/sounds
mkdir -p "$out"

ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# 440Hz / 0.15s。前後に短いフェードを入れてクリックノイズを防ぐ
ff -f lavfi -i "sine=frequency=440:duration=0.15" \
  -af "afade=t=in:d=0.01,afade=t=out:st=0.12:d=0.03,volume=0.8" \
  -ac 1 -ar 44100 -c:a libmp3lame -q:a 4 "$out/warn.mp3"

# 880Hz / 2s のロングビープ 1 回
ff -f lavfi -i "sine=frequency=880:duration=2.0" \
  -af "afade=t=in:d=0.01,afade=t=out:st=0.5:d=1.5:curve=par,volume=0.8" \
  -ac 1 -ar 44100 -c:a libmp3lame -q:a 4 "$out/end.mp3"

ls -l "$out"
