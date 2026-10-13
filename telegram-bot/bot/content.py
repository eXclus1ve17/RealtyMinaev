"""Загрузка и проверка файла текстов content.yaml."""
import re

import yaml

ALLOWED_TAG = re.compile(r"</?(b|i|u|s|code)>|<a href=\"[^\"<>]+\">|</a>")
TAG = re.compile(r"<[^>]*>")
FAQ_ANSWER_MAX = 600
BUTTON_MAX = 40


class ContentError(ValueError):
    pass


def plain(text):
    return TAG.sub("", text)


def _check_html(where, text, problems):
    pos = 0
    while True:
        i = text.find("<", pos)
        if i < 0:
            return
        m = ALLOWED_TAG.match(text, i)
        if not m:
            problems.append(
                "%s: символ «<» или неизвестный тег. Разрешены <b>, <i>, <u>, <s>, <a href=\"…\">." % where
            )
            return
        pos = m.end()


def _req(data, path, problems):
    cur = data
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            problems.append("нет обязательного поля %s" % path)
            return None
        cur = cur[part]
    if isinstance(cur, str) and not cur.strip():
        problems.append("пустое поле %s" % path)
    return cur


def validate(data):
    problems = []
    if not isinstance(data, dict):
        raise ContentError("файл пуст или повреждён")

    for path in (
        "links.site", "links.dmitry", "links.privacy", "links.card_fallback",
        "welcome", "menu_text", "fallback", "error",
        "services.title", "faq.title",
        "lead.task_prompt", "lead.name_prompt", "lead.name_invalid", "lead.consent_prompt",
        "lead.consent_declined", "lead.phone_prompt", "lead.phone_invalid", "lead.phone_saved",
        "lead.comment_prompt", "lead.comment_too_long", "lead.confirm", "lead.edit_prompt",
        "lead.done", "lead.send_failed", "lead.cancelled", "lead.use_buttons",
        "lead.no_comment", "lead.admin_message",
        "links.bot", "links.consent", "business.greeting",
        "contact.intro", "contact.phone", "contact.first_name", "contact.vcard",
    ):
        value = _req(data, path, problems)
        if isinstance(value, str):
            _check_html(path, value, problems)

    buttons = _req(data, "buttons", problems) or {}
    for key in (
        "card", "services", "faq", "lead", "site", "write", "back", "menu",
        "more_on_site", "consent_yes", "consent_no", "share_phone", "skip", "send", "edit",
        "cancel", "retry", "edit_task", "edit_name", "edit_phone", "edit_comment",
        "biz_menu", "biz_lead", "biz_card",
    ):
        label = buttons.get(key) if isinstance(buttons, dict) else None
        if not label:
            problems.append("нет подписи кнопки buttons.%s" % key)
        elif len(label) > BUTTON_MAX:
            problems.append("buttons.%s: подпись длиннее %d знаков" % (key, BUTTON_MAX))

    keys = set()
    for n, item in enumerate((data.get("services") or {}).get("items") or [], 1):
        where = "services.items[%d]" % n
        for f in ("key", "button", "text"):
            if not item.get(f):
                problems.append("%s: нет поля %s" % (where, f))
        if item.get("key") in keys:
            problems.append("%s: повторяется key %s" % (where, item.get("key")))
        keys.add(item.get("key"))
        if len(item.get("button", "")) > BUTTON_MAX:
            problems.append("%s: подпись кнопки длиннее %d знаков" % (where, BUTTON_MAX))
        _check_html(where, item.get("text", ""), problems)
    if not keys:
        problems.append("services.items: нет ни одной услуги")

    keys = set()
    for n, cat in enumerate((data.get("faq") or {}).get("categories") or [], 1):
        where = "faq.categories[%d]" % n
        for f in ("key", "button", "title"):
            if not cat.get(f):
                problems.append("%s: нет поля %s" % (where, f))
        if cat.get("key") in keys:
            problems.append("%s: повторяется key %s" % (where, cat.get("key")))
        keys.add(cat.get("key"))
        questions = cat.get("questions") or []
        if not 1 <= len(questions) <= 8:
            problems.append("%s: должно быть от 1 до 8 вопросов" % where)
        for m, q in enumerate(questions, 1):
            qw = "%s, вопрос %d" % (where, m)
            if not q.get("q") or not q.get("a"):
                problems.append("%s: нужны поля q и a" % qw)
                continue
            if len(q.get("button") or q["q"]) > BUTTON_MAX:
                problems.append("%s: текст на кнопке длиннее %d знаков — добавьте короткое поле button" % (qw, BUTTON_MAX))
            if len(plain(q["a"]).strip()) > FAQ_ANSWER_MAX:
                problems.append("%s: ответ длиннее %d знаков (%d)" % (qw, FAQ_ANSWER_MAX, len(plain(q["a"]).strip())))
            _check_html(qw, q["a"], problems)
    if not keys:
        problems.append("faq.categories: нет ни одной категории")

    tasks = (data.get("lead") or {}).get("tasks") or []
    if not tasks:
        problems.append("lead.tasks: нет вариантов задачи")
    for n, t in enumerate(tasks, 1):
        if not t.get("key") or not t.get("button"):
            problems.append("lead.tasks[%d]: нужны поля key и button" % n)

    if problems:
        raise ContentError("\n".join(problems))
    return data


def load(path):
    with open(path, encoding="utf-8") as f:
        try:
            data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            mark = getattr(e, "problem_mark", None)
            where = " (строка %d)" % (mark.line + 1) if mark else ""
            raise ContentError("ошибка разметки YAML%s: %s" % (where, getattr(e, "problem", e))) from None
    return Content(validate(data))


class Content(dict):
    def service(self, key):
        return next((s for s in self["services"]["items"] if s["key"] == key), None)

    def category(self, key):
        return next((c for c in self["faq"]["categories"] if c["key"] == key), None)

    def task_label(self, key):
        return next((t["button"] for t in self["lead"]["tasks"] if t["key"] == key), key)
