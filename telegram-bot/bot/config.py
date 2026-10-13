"""Настройки бота. Секреты берутся только из .env или переменных окружения."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def load_env(path):
    """Читает файл KEY=VALUE. Уже заданные переменные окружения не перезаписывает."""
    path = Path(path)
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


class Config:
    def __init__(self, env_file=None):
        load_env(env_file or BASE_DIR / ".env")
        self.bot_token = os.environ.get("BOT_TOKEN", "")
        self.webhook_secret = os.environ.get("WEBHOOK_SECRET", "")
        self.webhook_path = os.environ.get("WEBHOOK_PATH", "/webhook")
        admin = os.environ.get("ADMIN_CHAT_ID", "").strip()
        self.admin_chat_id = int(admin) if admin.lstrip("-").isdigit() else None
        self.webapp_url = os.environ.get("WEBAPP_URL", "")
        self.public_url = os.environ.get("PUBLIC_URL", "")
        self.telegram_api_base = os.environ.get("TELEGRAM_API_BASE", "")
        self.relay_key = os.environ.get("RELAY_KEY", "")
        self.banner_path = os.environ.get("BANNER_PATH", str(BASE_DIR / "assets" / "banner.jpg"))
        self.state_db = os.environ.get("STATE_DB", str(BASE_DIR / "data" / "state.sqlite3"))
        self.content_path = os.environ.get("CONTENT_PATH", str(BASE_DIR / "content.yaml"))
        self.log_file = os.environ.get("LOG_FILE", str(BASE_DIR / "data" / "errors.log"))

    def missing(self):
        """Список незаполненных обязательных настроек."""
        names = []
        if not self.bot_token:
            names.append("BOT_TOKEN")
        if self.admin_chat_id is None:
            names.append("ADMIN_CHAT_ID")
        return names
