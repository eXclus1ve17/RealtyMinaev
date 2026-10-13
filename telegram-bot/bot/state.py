"""Черновики заявок на время заполнения.

Хранится только незавершённая заявка. После отправки или отмены она удаляется,
брошенные черновики стираются через TTL_SECONDS.
"""
import json
import sqlite3
import time
from pathlib import Path

TTL_SECONDS = 24 * 60 * 60


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
