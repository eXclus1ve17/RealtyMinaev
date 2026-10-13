"""Минимальный клиент Telegram Bot API на стандартной библиотеке.

Запросы можно направлять через посредника (Cloudflare Worker): адрес — TELEGRAM_API_BASE,
ключ доступа к посреднику — RELAY_KEY (заголовок X-Relay-Key).
"""
import json
import mimetypes
import os
import urllib.error
import urllib.request
import uuid

DEFAULT_BASE = "https://api.telegram.org"


class TelegramError(Exception):
    def __init__(self, description, code=None):
        super().__init__(description)
        self.description = description
        self.code = code


class TelegramAPI:
    def __init__(self, token, timeout=20, base=None, relay_key=None):
        self._base = (base or DEFAULT_BASE).rstrip("/") + "/bot" + token + "/"
        self._timeout = timeout
        self._relay_key = relay_key or ""

    def _headers(self, content_type):
        # Cloudflare отклоняет запросы с подписью Python-urllib (403), поэтому своя подпись
        h = {"Content-Type": content_type, "User-Agent": "RealtyMinaevBot/1.0"}
        if self._relay_key:
            h["X-Relay-Key"] = self._relay_key
        return h

    def call(self, method, **params):
        params = {k: v for k, v in params.items() if v is not None}
        data = json.dumps(params, ensure_ascii=False).encode("utf-8")
        return self._send(method, data, self._headers("application/json"))

    def upload(self, method, file_field, path, **params):
        """Отправка файла (например, фото) multipart-запросом."""
        boundary = uuid.uuid4().hex
        body = b""
        for k, v in params.items():
            if v is None:
                continue
            if not isinstance(v, str):
                v = json.dumps(v, ensure_ascii=False)
            body += ('--%s\r\nContent-Disposition: form-data; name="%s"\r\n\r\n' % (boundary, k)).encode()
            body += v.encode("utf-8") + b"\r\n"
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        body += ('--%s\r\nContent-Disposition: form-data; name="%s"; filename="%s"\r\nContent-Type: %s\r\n\r\n'
                 % (boundary, file_field, os.path.basename(path), ctype)).encode()
        with open(path, "rb") as f:
            body += f.read() + b"\r\n"
        body += ("--%s--\r\n" % boundary).encode()
        return self._send(method, body, self._headers("multipart/form-data; boundary=" + boundary))

    def _send(self, method, data, headers):
        req = urllib.request.Request(self._base + method, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                body = json.load(resp)
        except urllib.error.HTTPError as e:
            # Telegram возвращает описание ошибки в теле ответа
            try:
                body = json.load(e)
            except ValueError:
                raise TelegramError("HTTP %s" % e.code, e.code) from None
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            # в тексте ошибки нет URL, поэтому токен в лог не попадёт
            reason = getattr(e, "reason", e)
            raise TelegramError("network: %s" % type(reason).__name__) from None
        if not body.get("ok"):
            raise TelegramError(body.get("description", "unknown"), body.get("error_code"))
        return body.get("result")
