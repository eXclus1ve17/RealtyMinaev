"""Черновики заявок и служебные отметки режима Telegram Business.

Хранится только незавершённая заявка. После отправки или отмены она удаляется,
брошенные черновики стираются через TTL_SECONDS.
Для автоответа в личных сообщениях хранятся только хэш чата и время
(без текста и имён), чтобы приветствовать человека один раз.
"""
import hashlib
import json
import sqlite3
import time
from pathlib import Path

TTL_SECONDS = 24 * 60 * 60
GREETED_TTL_SECONDS = 180 * 24 * 60 * 60


class StateStore:
    def __init__(self, path):
        self._path = str(path)
        if self._path != ":memory:":
            Path(self._path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self._path, timeout=10, check_same_thread=False)
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS drafts ("
            "user_id INTEGER PRIMARY KEY, step TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL)"
        )
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS business ("
            "id TEXT PRIMARY KEY, owner INTEGER NOT NULL, can_reply INTEGER NOT NULL, enabled INTEGER NOT NULL)"
        )
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS greeted (chat TEXT PRIMARY KEY, at INTEGER NOT NULL)"
        )
        self._conn.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)")
        self._conn.commit()

    def _purge(self):
        self._conn.execute("DELETE FROM drafts WHERE updated < ?", (int(time.time()) - TTL_SECONDS,))

    def get(self, user_id):
        """Возвращает (step, data) или (None, {})."""
        self._purge()
        self._conn.commit()
        row = self._conn.execute(
            "SELECT step, data FROM drafts WHERE user_id = ?", (user_id,)
        ).fetchone()
        if not row:
            return None, {}
        return row[0], json.loads(row[1])

    def set(self, user_id, step, data):
        self._conn.execute(
            "INSERT OR REPLACE INTO drafts (user_id, step, data, updated) VALUES (?, ?, ?, ?)",
            (user_id, step, json.dumps(data, ensure_ascii=False), int(time.time())),
        )
        self._conn.commit()

    def clear(self, user_id):
        self._conn.execute("DELETE FROM drafts WHERE user_id = ?", (user_id,))
        self._conn.commit()

    # ---------- Telegram Business ----------

    def set_business(self, conn_id, owner, can_reply, enabled):
        self._conn.execute(
            "INSERT OR REPLACE INTO business (id, owner, can_reply, enabled) VALUES (?, ?, ?, ?)",
            (conn_id, owner, int(bool(can_reply)), int(bool(enabled))),
        )
        self._conn.commit()

    def get_business(self, conn_id):
        """Возвращает (owner, can_reply, enabled) или None."""
        row = self._conn.execute(
            "SELECT owner, can_reply, enabled FROM business WHERE id = ?", (conn_id,)
        ).fetchone()
        return (row[0], bool(row[1]), bool(row[2])) if row else None

    @staticmethod
    def _chat_key(salt, chat_id):
        return hashlib.sha256(("%s:%s" % (salt, chat_id)).encode()).hexdigest()

    def was_greeted(self, salt, chat_id):
        self._conn.execute("DELETE FROM greeted WHERE at < ?", (int(time.time()) - GREETED_TTL_SECONDS,))
        self._conn.commit()
        return self._conn.execute(
            "SELECT 1 FROM greeted WHERE chat = ?", (self._chat_key(salt, chat_id),)
        ).fetchone() is not None

    def mark_greeted(self, salt, chat_id):
        self._conn.execute(
            "INSERT OR REPLACE INTO greeted (chat, at) VALUES (?, ?)",
            (self._chat_key(salt, chat_id), int(time.time())),
        )
        self._conn.commit()

    # ---------- служебные значения (например, file_id баннера) ----------

    def get_kv(self, key):
        row = self._conn.execute("SELECT v FROM kv WHERE k = ?", (key,)).fetchone()
        return row[0] if row else ""

    def set_kv(self, key, value):
        self._conn.execute("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)", (key, value))
        self._conn.commit()
