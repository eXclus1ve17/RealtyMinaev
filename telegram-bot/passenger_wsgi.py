"""Точка входа для Passenger (хостинг reg.ru)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bot.app import application  # noqa: E402,F401
