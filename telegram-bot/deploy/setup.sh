#!/bin/bash
# Установка Telegram-бота @RealtyMinaev_bot на хостинг reg.ru (ISPmanager).
# Запуск в Shell-клиенте:  bash ~/telegram-bot/deploy/setup.sh
# Скрипт можно запускать повторно: он перезапишет настройки и перезапустит бота.
set -u

BOT_DIR="$HOME/telegram-bot"
SITE_DIR="$HOME/www/realtyminaev.ru"
BOT_SITE="$HOME/www/bot.realtyminaev.ru"
BOT_URL="https://bot.realtyminaev.ru"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗ %s\033[0m\n' "$1"; echo; echo "Сделайте скриншот этого окна и пришлите разработчику."; exit 1; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

step "1. Проверяю папки"
[ -f "$BOT_DIR/bot/app.py" ] || fail "Не найдена папка $BOT_DIR — распакуйте telegram-bot.zip в домашнюю папку."
ok "Код бота: $BOT_DIR"
[ -d "$SITE_DIR" ] && ok "Сайт: $SITE_DIR" || fail "Не найдена папка сайта $SITE_DIR"
[ -d "$BOT_SITE" ] || fail "Не найдена папка $BOT_SITE — создайте сайт bot.realtyminaev.ru в ISPmanager (шаг 3 инструкции)."
ok "Сайт бота: $BOT_SITE"

step "2. Ищу Python"
PY=""; BEST=0
for c in /opt/python/*/bin/python3 /usr/local/bin/python3.* /usr/bin/python3.* /usr/bin/python3 $(command -v python3 2>/dev/null); do
  [ -x "$c" ] || continue
  v=$("$c" -c 'import sys; print(sys.version_info[0]*100+sys.version_info[1])' 2>/dev/null) || continue
  if [ "$v" -ge 308 ] && [ "$v" -gt "$BEST" ]; then BEST=$v; PY=$c; fi
done
[ -n "$PY" ] || fail "Python 3.8+ не найден. Попросите поддержку reg.ru включить Python для тарифа."
ok "Python: $PY ($("$PY" --version 2>&1))"

step "3. Проверяю код и тексты"
"$PY" -c "import sys; sys.path.insert(0, '$BOT_DIR'); import sqlite3, bot.app" || fail "Код бота не запускается этим Python."
"$PY" "$BOT_DIR/check_content.py" || fail "Ошибка в content.yaml"

step "4. Проверяю связь с Telegram"
"$PY" - <<'PYEOF' || fail "С хостинга нет связи с api.telegram.org — напишите в поддержку reg.ru: «разрешите исходящие HTTPS-запросы к api.telegram.org»."
import sys, urllib.request, urllib.error
try:
    urllib.request.urlopen("https://api.telegram.org", timeout=15)
except urllib.error.HTTPError:
    pass  # сервер ответил — связь есть
except Exception as e:
    print("  Ошибка соединения:", getattr(e, "reason", e))
    sys.exit(1)
PYEOF
ok "api.telegram.org доступен"

step "5. Настройки (.env)"
ENV="$BOT_DIR/.env"
if [ -f "$ENV" ]; then
  read -r -p "  Файл .env уже есть. Ввести токен заново? (да/нет) " again
else
  again="да"
fi
if [ "$again" = "да" ]; then
  read -r -s -p "  Вставьте токен бота от @BotFather (символы не видны) и нажмите Enter: " TOKEN; echo
  read -r -p "  Ваш chat_id (число от @userinfobot): " CHAT
  TOKEN=$(echo "$TOKEN" | tr -d '[:space:]'); CHAT=$(echo "$CHAT" | tr -d '[:space:]')
  [[ "$TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]{30,}$ ]] || fail "Токен не похож на токен BotFather."
  [[ "$CHAT" =~ ^-?[0-9]+$ ]] || fail "chat_id должен быть числом."
  SECRET=$("$PY" -c 'import secrets; print(secrets.token_urlsafe(32))')
  umask 077
  cat > "$ENV" <<ENVEOF
BOT_TOKEN=$TOKEN
ADMIN_CHAT_ID=$CHAT
WEBHOOK_SECRET=$SECRET
PUBLIC_URL=$BOT_URL
WEBHOOK_PATH=/webhook
WEBAPP_URL=https://realtyminaev.ru/card/app/
ENVEOF
  chmod 600 "$ENV"
  # тот же токен — для формы заявок на сайте (lead.php), файл вне папки сайта
  cat > "$HOME/www/lead-config.php" <<PHPEOF
<?php
// Создан скриптом установки бота. Не загружайте этот файл в папку сайта.
return ['tg_token' => '$TOKEN', 'tg_chat' => '$CHAT'];
PHPEOF
  chmod 600 "$HOME/www/lead-config.php"
  umask 022
  ok "Настройки сохранены (.env и lead-config.php доступны только вам)"
fi
mkdir -p "$BOT_DIR/data" && chmod 700 "$BOT_DIR/data"
(cd "$BOT_DIR" && "$PY" manage.py check) || fail "Токен не подошёл или Telegram недоступен."

step "6. Подключаю бота к сайту bot.realtyminaev.ru"
cat > "$BOT_SITE/passenger_wsgi.py" <<WSGIEOF
# Создан скриптом установки. Код бота — в $BOT_DIR (вне папки сайта).
import os
import sys

INTERP = "$PY"
if os.path.exists(INTERP) and os.path.realpath(sys.executable) != os.path.realpath(INTERP):
    os.execl(INTERP, INTERP, *sys.argv)

sys.path.insert(0, "$BOT_DIR")
from bot.app import application  # noqa: E402,F401
WSGIEOF
cat > "$BOT_SITE/.htaccess" <<HTEOF
PassengerEnabled On
PassengerPython $PY
Options -Indexes
HTEOF
mkdir -p "$BOT_SITE/tmp" && touch "$BOT_SITE/tmp/restart.txt"
ok "Файлы запуска записаны, приложение перезапущено"

step "7. Проверяю, что бот отвечает по адресу $BOT_URL"
sleep 3
H=$(curl -s --max-time 20 "$BOT_URL/health" 2>/dev/null)
if [ "$H" = "ok" ]; then
  ok "$BOT_URL/health → ok"
else
  echo "  Ответ: ${H:0:200}"
  fail "Бот не отвечает по $BOT_URL/health. Проверьте SSL-сертификат поддомена и пришлите скриншот."
fi

step "8. Запуск в боевом режиме"
read -r -p "  Подключить бота к Telegram и включить кнопку «Визитка»? (да/нет) " go
if [ "$go" = "да" ]; then
  (cd "$BOT_DIR" && "$PY" manage.py set-webhook && "$PY" manage.py setup-menu && "$PY" manage.py check) || fail "Не удалось подключить вебхук."
  echo; ok "Готово. Откройте @RealtyMinaev_bot и нажмите «Старт»."
else
  echo "  Пропущено. Запустить позже: cd ~/telegram-bot && $PY manage.py set-webhook && $PY manage.py setup-menu"
fi
