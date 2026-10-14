#!/bin/sh
# Собирает сайт и кладёт готовые файлы в ветку site (один коммит, без истории).
# На хостинге их забирает одна команда — см. docs/vykladka-na-hosting.md.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
npx eleventy --quiet
SRC=$(git rev-parse --short HEAD)
TMP=$(mktemp -d)
git worktree add -q --detach "$TMP"
cd "$TMP"
git checkout -q --orphan site-publish
git rm -rqf .
cp -a "$ROOT/_site/." .
git add -A
git commit -qm "Сайт из $SRC"
git push -qf origin site-publish:site
cd "$ROOT"
git worktree remove --force "$TMP"
git branch -D site-publish >/dev/null
echo "Ветка site обновлена (исходник $SRC)"
