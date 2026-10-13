"""WSGI-приложение для вебхука Telegram (Passenger на reg.ru или любой WSGI-сервер)."""
import hmac
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from . import content as content_mod
from .config import Config
from .handlers import Bot
from .state import StateStore
from .telegram import TelegramAPI

MAX_BODY = 1024 * 1024
_bot = None
_cfg = None


def setup_logging(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(path, maxBytes=512 * 1024, backupCount=2, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    root = logging.getLogger()
    root.setLevel(logging.WARNING)
    root.addHandler(handler)


def build(cfg):
    return Bot(TelegramAPI(cfg.bot_token), content_mod.load(cfg.content_path), StateStore(cfg.state_db), cfg)


def _get():
    global _bot, _cfg
    if _bot is None:
        _cfg = Config()
        setup_logging(_cfg.log_file)
        missing = _cfg.missing()
        if missing:
            raise RuntimeError("не заполнено в .env: " + ", ".join(missing))
        _bot = build(_cfg)
    return _bot, _cfg


def _reply(start_response, status, text=""):
    body = text.encode("utf-8")
    start_response(status, [("Content-Type", "text/plain; charset=utf-8"), ("Content-Length", str(len(body)))])
    return [body]


def application(environ, start_response):
    bot, cfg = _get()
    path = environ.get("PATH_INFO", "")
    if path.rstrip("/") == "/health" and environ.get("REQUEST_METHOD") == "GET":
        return _reply(start_response, "200 OK", "ok")
    if path.rstrip("/") != cfg.webhook_path.rstrip("/") or environ.get("REQUEST_METHOD") != "POST":
        return _reply(start_response, "404 Not Found")

    secret = environ.get("HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN", "")
    if not cfg.webhook_secret or not hmac.compare_digest(secret, cfg.webhook_secret):
        return _reply(start_response, "403 Forbidden")

    try:
        length = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        length = 0
    if length <= 0 or length > MAX_BODY:
        return _reply(start_response, "400 Bad Request")
    try:
        update = json.loads(environ["wsgi.input"].read(length).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return _reply(start_response, "400 Bad Request")

    bot.handle_update(update)
    # Telegram всегда получает 200, иначе он будет повторять то же обновление
    return _reply(start_response, "200 OK", "ok")
