#!/bin/bash
# Сборка архивов для загрузки на хостинг.
#   bash deploy/build.sh [метка-базы] [папка-вывода]
# site-update.zip — только файлы сайта, изменённые после метки (по умолчанию live-2026-10-13).
# telegram-bot.zip — код бота без секретов, тестов и служебных файлов.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${1:-live-2026-10-13}"; OUT="${2:-dist}"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
rm -f "$OUT/site-update.zip" "$OUT/telegram-bot.zip"
git diff --name-only --diff-filter=AM "$BASE" -- . \
  ':!telegram-bot' ':!deploy' ':!README.md' ':!.gitignore' ':!dist' > "$OUT/site-files.txt"
git ls-files --others --exclude-standard -- . ':!telegram-bot' ':!deploy' ':!dist' ':!.gitignore' ':!README.md' >> "$OUT/site-files.txt"
sort -u -o "$OUT/site-files.txt" "$OUT/site-files.txt"
zip -q -X "$OUT/site-update.zip" -@ < "$OUT/site-files.txt"
zip -q -X -r "$OUT/telegram-bot.zip" telegram-bot \
  -x 'telegram-bot/.env' 'telegram-bot/data/*' '*/__pycache__/*' '*.pyc' 'telegram-bot/tests/*' 'telegram-bot/docs/*'
echo "Файлов сайта: $(wc -l < "$OUT/site-files.txt")"
ls -la "$OUT"/*.zip
