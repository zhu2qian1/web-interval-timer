#!/usr/bin/env bash
# 開発サーバを起動する。必要なら mise のツールと依存パッケージを先にインストールする。
#   scripts/dev.sh            # http://localhost:5173/
#   scripts/dev.sh --host     # LAN に公開（スマホ実機での確認用）
# 引数はそのまま vite に渡す。
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v mise >/dev/null 2>&1; then
  echo "mise が見つかりません: https://mise.jdx.dev/ を参照してインストールしてください" >&2
  exit 1
fi

mise install --quiet

# node_modules が無い、または lockfile の方が新しければ依存を入れ直す
if [[ ! -d node_modules || pnpm-lock.yaml -nt node_modules/.modules.yaml ]]; then
  mise exec -- pnpm install --frozen-lockfile
fi

exec mise exec -- pnpm dev "$@"
