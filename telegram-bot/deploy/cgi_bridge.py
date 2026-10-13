"""Запуск бота как CGI-скрипта или через PHP-мост — для хостинга без Passenger.

CGI:  bot.cgi (создаёт setup.sh) → этот модуль → WSGI-приложение бота.
PHP:  index.php передаёт запрос сюда через stdin/переменные окружения,
      ответ возвращается как «статус\\nтело».
"""
import os
import sys
from urllib.parse import urlsplit

BOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BOT_DIR)

from bot.app import application  # noqa: E402


def run_cgi():
    os.environ["PATH_INFO"] = urlsplit(os.environ.get("REQUEST_URI", "/")).path
    from wsgiref.handlers import CGIHandler
    CGIHandler().run(application)


def run_php_bridge():
    environ = dict(os.environ)
    environ["wsgi.input"] = sys.stdin.buffer
    status = []
    body = application(environ, lambda s, h: status.append(s))
    out = sys.stdout.buffer
    out.write((status[0] if status else "500 Internal Server Error").encode() + b"\n")
    for chunk in body:
        out.write(chunk)
    out.flush()


if __name__ == "__main__":
    if os.environ.get("BOT_BRIDGE") == "php":
        run_php_bridge()
    else:
        run_cgi()
