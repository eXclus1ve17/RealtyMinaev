"""Проверка content.yaml после правки текстов: python3 check_content.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bot.content import ContentError, load  # noqa: E402

path = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parent / "content.yaml")
try:
    c = load(path)
except ContentError as e:
    print("Найдены ошибки:\n" + str(e))
    sys.exit(1)
questions = sum(len(cat["questions"]) for cat in c["faq"]["categories"])
print("Всё в порядке: %d услуг, %d категорий вопросов, %d ответов." % (
    len(c["services"]["items"]), len(c["faq"]["categories"]), questions))
