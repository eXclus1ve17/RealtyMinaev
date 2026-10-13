"""Минимальный клиент Telegram Bot API на стандартной библиотеке."""
import json
import urllib.error
import urllib.request


class TelegramError(Exception):
    def __init__(self, description, code=None):
        super().__init__(description)
        self.description = description
        self.code = code


class TelegramAPI:
    def __init__(self, token, timeout=15):
        self._base = "https://api.telegram.org/bot" + token + "/"
        self._timeout = timeout

    def call(self, method, **params):
        params = {k: v for k, v in params.items() if v is not None}
        data = json.dumps(params, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            self._base + method, data=data, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                body = json.load(resp)
        except urllib.error.HTTPError as e:
            # Telegram возвращает описание ошибки в теле ответа
            try:
                body = json.load(e)
            except ValueError:
                raise TelegramError("HTTP %s" % e.code, e.code) from None
        except urllib.error.URLError as e:
            # в тексте ошибки нет URL, поэтому токен в лог не попадёт
            raise TelegramError("network: %s" % type(e.reason).__name__) from None
        if not body.get("ok"):
            raise TelegramError(body.get("description", "unknown"), body.get("error_code"))
        return body.get("result")
