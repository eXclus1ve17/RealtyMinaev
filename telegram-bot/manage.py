"""Управление ботом на хостинге.

  python3 manage.py check          — проверить токен, связь с Telegram и тексты
  python3 manage.py set-webhook    — подключить бота к адресу PUBLIC_URL (боевой режим)
  python3 manage.py delete-webhook — отключить вебхук
  python3 manage.py setup-menu     — кнопка «Визитка» в чате и список команд
"""
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
]


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    cfg = Config()
    missing = cfg.missing()
    if missing:
        sys.exit("Не заполнено в .env: " + ", ".join(missing))
    api = TelegramAPI(cfg.bot_token)
    try:
        if cmd == "check":
            me = api.call("getMe")
            print("Связь с Telegram: есть. Бот: @%s" % me["username"])
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
                     allowed_updates=["message", "callback_query", "business_connection", "business_message"], drop_pending_updates=True)
            print("Вебхук установлен: %s%s" % (base, cfg.webhook_path))
        elif cmd == "delete-webhook":
            api.call("deleteWebhook")
            print("Вебхук отключён.")
        elif cmd == "setup-menu":
            if cfg.webapp_url:
                api.call("setChatMenuButton", menu_button={
                    "type": "web_app", "text": "Визитка", "web_app": {"url": cfg.webapp_url}})
                print("Кнопка «Визитка» в чате: %s" % cfg.webapp_url)
            api.call("setMyCommands", commands=COMMANDS)
            print("Команды бота обновлены.")
        else:
            sys.exit(__doc__)
    except TelegramError as e:
        sys.exit("Ошибка Telegram: %s" % e.description)
    except ContentError as e:
        sys.exit("Ошибка в content.yaml:\n%s" % e)


if __name__ == "__main__":
    main()
