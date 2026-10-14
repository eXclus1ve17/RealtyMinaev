"""Управление ботом на хостинге.

  python3 manage.py check          — проверить токен, связь с Telegram и тексты
  python3 manage.py set-webhook    — подключить бота к адресу PUBLIC_URL (боевой режим)
  python3 manage.py delete-webhook — отключить вебхук
  python3 manage.py setup-menu     — кнопка «Меню» внизу чата (мини-приложение) и список команд
  python3 manage.py use-relay URL  — работать через посредника Cloudflare (адрес воркера)
  python3 manage.py export-app     — тексты услуг и вопросов для мини-приложения (data.json на сайте)
"""
import json
import os
import re
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bot.config import Config  # noqa: E402
from bot.content import ContentError, load  # noqa: E402
from bot.telegram import TelegramAPI, TelegramError  # noqa: E402

COMMANDS = [
    {"command": "start", "description": "Главное меню"},
    {"command": "lead", "description": "Оставить заявку"},
    {"command": "menu", "description": "Меню"},
    {"command": "cancel", "description": "Отменить заявку"},
    {"command": "contact", "description": "Сохранить мой контакт"},
]


def set_env(updates):
    """Меняет значения в .env, остальные строки оставляет как есть."""
    path = Path(__file__).resolve().parent / ".env"
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    done = set()
    for i, line in enumerate(lines):
        key = line.split("=", 1)[0].strip()
        if key in updates:
            lines[i] = "%s=%s" % (key, updates[key])
            done.add(key)
    lines += ["%s=%s" % (k, v) for k, v in updates.items() if k not in done]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    path.chmod(0o600)


def update_lead_config(cfg, relay_url, relay_key):
    """Форма сайта (lead.php) тоже отправляет заявки через посредника."""
    path = Path.home() / "www" / "lead-config.php"
    if not path.exists():
        return False
    path.write_text(
        "<?php\n// Создан скриптом установки бота. Не загружайте этот файл в папку сайта.\n"
        "return ['tg_token' => '%s', 'tg_chat' => '%s', 'tg_api' => '%s', 'tg_relay_key' => '%s'];\n"
        % (cfg.bot_token, cfg.admin_chat_id, relay_url, relay_key), encoding="utf-8")
    path.chmod(0o600)
    return True


def app_data(content):
    """Услуги, вопросы и задачи заявки для мини-приложения — те же тексты, что в боте."""
    def plain(t):
        return re.sub(r"<[^>]+>", "", t or "").strip()

    def body(t):
        # первая строка ответа бота — жирный заголовок, в приложении он уже есть в названии
        t = plain(t)
        return t.split("\n", 1)[1].strip() if "\n" in t else t

    return {
        "services": [{"title": s["button"], "text": body(s["text"])} for s in content["services"]["items"]],
        "faq": [{"title": c["button"], "q": [{"q": q["q"], "a": plain(q["a"])} for q in c["questions"]]}
                for c in content["faq"]["categories"]],
        "tasks": [t["button"] for t in content["lead"]["tasks"]],
    }


def export_app(cfg, path=None):
    path = Path(path or os.environ.get("APP_DATA") or Path.home() / "www" / "realtyminaev.ru" / "card" / "app" / "data.json")
    data = app_data(load(cfg.content_path))
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("Мини-приложение: %d услуг, %d тем вопросов → %s" % (len(data["services"]), len(data["faq"]), path))


def use_relay(url):
    url = url.strip().rstrip("/")
    if not re.match(r"^https://[a-z0-9.-]+$", url):
        sys.exit("Укажите адрес воркера целиком, например https://tg-relay.имя.workers.dev")
    cfg = Config()
    key = cfg.relay_key or secrets.token_urlsafe(24)
    api = TelegramAPI(cfg.bot_token, base=url, relay_key=key)
    try:
        api.call("getMe")
    except TelegramError as e:
        print()
        if e.description.startswith("network"):
            print("Хостинг не может связаться с посредником (%s)." % e.description)
            print("Проверьте адрес: он открывается в браузере? Пришлите этот текст разработчику.")
            sys.exit(1)
        print("Посредник не пропустил запрос (%s)." % e.description)
        print("Проверьте, что в Cloudflare → воркер → Settings → Variables добавлена переменная")
        print("  RELAY_KEY = %s" % key)
        print("и запустите команду ещё раз.")
        set_env({"RELAY_KEY": key})
        sys.exit(1)
    new = {"TELEGRAM_API_BASE": url, "RELAY_KEY": key, "PUBLIC_URL": url}
    set_env(new)
    os.environ.update(new)
    print("Посредник работает: %s" % url)
    if update_lead_config(cfg, url, key):
        print("Форма сайта тоже отправляет заявки через посредника.")


def run(cmd):
    cfg = Config()
    missing = cfg.missing()
    if missing:
        sys.exit("Не заполнено в .env: " + ", ".join(missing))
    api = TelegramAPI(cfg.bot_token, base=cfg.telegram_api_base, relay_key=cfg.relay_key)
    try:
        if cmd == "check":
            me = api.call("getMe")
            print("Связь с Telegram: есть. Бот: @%s" % me["username"])
            if cfg.telegram_api_base:
                print("Через посредника: %s" % cfg.telegram_api_base)
            c = load(cfg.content_path)
            print("Тексты: в порядке (%d услуг, %d тем вопросов)." % (
                len(c["services"]["items"]), len(c["faq"]["categories"])))
            info = api.call("getWebhookInfo")
            print("Вебхук: %s" % (info.get("url") or "не установлен"))
            if info.get("last_error_message"):
                print("Последняя ошибка доставки: %s" % info["last_error_message"])
            print("Ожидают доставки: %s" % info.get("pending_update_count", 0))
        elif cmd == "set-webhook":
            base = cfg.public_url.rstrip("/")
            if not base.startswith("https://"):
                sys.exit("PUBLIC_URL в .env должен начинаться с https://")
            api.call("setWebhook", url=base + cfg.webhook_path, secret_token=cfg.webhook_secret,
                     allowed_updates=["message", "callback_query", "business_connection", "business_message"])
            print("Вебхук установлен: %s%s" % (base, cfg.webhook_path))
        elif cmd == "delete-webhook":
            api.call("deleteWebhook")
            print("Вебхук отключён.")
        elif cmd == "setup-menu":
            if cfg.webapp_url:
                label = load(cfg.content_path)["buttons"].get("menu_button") or "Меню"
                api.call("setChatMenuButton", menu_button={
                    "type": "web_app", "text": label, "web_app": {"url": cfg.webapp_url}})
                print("Кнопка «%s» в чате: %s" % (label, cfg.webapp_url))
            api.call("setMyCommands", commands=COMMANDS)
            print("Команды бота обновлены.")
        else:
            sys.exit(__doc__)
    except TelegramError as e:
        sys.exit("Ошибка Telegram: %s" % e.description)
    except ContentError as e:
        sys.exit("Ошибка в content.yaml:\n%s" % e)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    if cmd == "export-app":
        try:
            export_app(Config(), sys.argv[2] if len(sys.argv) > 2 else None)
        except ContentError as e:
            sys.exit("Ошибка в content.yaml:\n%s" % e)
        return
    if cmd == "use-relay":
        if len(sys.argv) < 3:
            sys.exit("Укажите адрес воркера: python3 manage.py use-relay https://...workers.dev")
        use_relay(sys.argv[2])
        for step in ("set-webhook", "setup-menu", "check"):
            run(step)
        return
    run(cmd)


if __name__ == "__main__":
    main()
