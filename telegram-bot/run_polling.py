"""Локальный запуск без вебхука — только для проверки на своём компьютере.

Если у бота уже установлен вебхук (бот работает на хостинге), скрипт не запустится,
чтобы не сломать рабочий бот.
"""
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bot.app import build  # noqa: E402
from bot.config import Config  # noqa: E402
from bot.telegram import TelegramError  # noqa: E402


def main():
    logging.basicConfig(level=logging.WARNING)
    cfg = Config()
    missing = cfg.missing()
    if missing:
        sys.exit("Не заполнено в .env: " + ", ".join(missing))
    bot = build(cfg)
    if bot.api.call("getWebhookInfo").get("url"):
        sys.exit("У бота установлен вебхук — он работает на хостинге. Локальный запуск отменён.")
    print("Бот запущен локально. Остановить: Ctrl+C")
    offset = 0
    while True:
        try:
            updates = bot.api.call("getUpdates", offset=offset, timeout=30)
        except TelegramError as e:
            print("Ошибка Telegram:", e.description)
            time.sleep(5)
            continue
        for u in updates:
            offset = u["update_id"] + 1
            bot.handle_update(u)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
