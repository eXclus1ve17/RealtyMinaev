import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from bot import app as app_mod  # noqa: E402
from bot.config import Config  # noqa: E402
from bot.content import ContentError, load, validate  # noqa: E402
from bot.handlers import Bot, normalize_phone  # noqa: E402
from bot.state import StateStore  # noqa: E402
from bot.telegram import TelegramError  # noqa: E402

ADMIN = 111
USER = {"id": 500, "first_name": "Иван", "username": "ivan_client"}


class FakeAPI:
    def __init__(self):
        self.calls = []
        self.fail_chat = None
        self.fail_edit = False
        self.fail_upload = False

    def call(self, method, **params):
        self.calls.append((method, params))
        if method == "sendMessage" and params.get("chat_id") == self.fail_chat:
            raise TelegramError("Forbidden: bot was blocked", 403)
        if method == "editMessageText" and self.fail_edit:
            raise TelegramError("Bad Request: message can't be edited", 400)
        if method == "sendPhoto":
            return {"message_id": len(self.calls), "photo": [{"file_id": "small"}, {"file_id": "BIG"}]}
        return {"message_id": len(self.calls)}

    def upload(self, method, file_field, path, **params):
        self.calls.append((method, dict(params, _file=path)))
        if self.fail_upload:
            raise TelegramError("network: timeout")
        return {"message_id": len(self.calls), "photo": [{"file_id": "small"}, {"file_id": "BIG"}]}

    def sent(self, chat_id=None):
        return [p for m, p in self.calls if m == "sendMessage" and (chat_id is None or p["chat_id"] == chat_id)]

    def shown(self):
        return [p for m, p in self.calls if m in ("sendMessage", "editMessageText")]

    def last(self):
        return self.shown()[-1]


def buttons(markup):
    out = []
    for row in (markup or {}).get("inline_keyboard", []):
        out.extend(row)
    return out


def labels(markup):
    return [b["text"] for b in buttons(markup)]


class Cfg:
    admin_chat_id = ADMIN
    webapp_url = "https://realtyminaev.ru/card/app/"


class BotTest(unittest.TestCase):
    def setUp(self):
        self.api = FakeAPI()
        self.content = load(ROOT / "content.yaml")
        self.bot = Bot(self.api, self.content, StateStore(":memory:"), Cfg())
        self.n = 0

    # --- помощники ---
    def text(self, text, user=USER):
        self.n += 1
        self.bot.handle_update({"update_id": self.n, "message": {
            "message_id": self.n, "from": user, "chat": {"id": user["id"], "type": "private"}, "text": text}})

    def contact(self, phone, user=USER):
        self.n += 1
        self.bot.handle_update({"update_id": self.n, "message": {
            "message_id": self.n, "from": user, "chat": {"id": user["id"], "type": "private"},
            "contact": {"phone_number": phone, "user_id": user["id"]}}})

    def press(self, data, user=USER):
        self.n += 1
        self.bot.handle_update({"update_id": self.n, "callback_query": {
            "id": str(self.n), "from": user, "data": data,
            "message": {"message_id": 1, "chat": {"id": user["id"], "type": "private"}}}})

    def b(self, key):
        return self.content["buttons"][key]

    def full_lead(self, comment="Бутово, до 15 млн"):
        self.press("lead")
        self.press("l:t:buy")
        self.text("Иван")
        self.press("l:consent:yes")
        self.text("8 (926) 123-45-67")
        if comment:
            self.text(comment)
        else:
            self.press("l:skip")

    # --- /start и меню ---
    def test_start_shows_welcome_and_menu(self):
        self.text("/start")
        msg = self.api.last()
        self.assertIn("Дмитрий Минаев", msg["text"])
        btns = buttons(msg["reply_markup"])
        # заявка (синяя) · услуги и вопросы · визитка — всё открывает разделы мини-приложения
        self.assertEqual(labels(msg["reply_markup"]), [self.b("biz_lead"), self.b("biz_menu"), self.b("biz_card")])
        self.assertEqual(btns[0].get("style"), "primary")
        self.assertEqual([b["web_app"]["url"] for b in btns], [
            "https://realtyminaev.ru/card/app/?tab=lead", "https://realtyminaev.ru/card/app/?tab=services",
            "https://realtyminaev.ru/card/app/?tab=card"])

    def test_menu_without_webapp_keeps_chat_buttons(self):
        self.bot.cfg = type("C", (), {"admin_chat_id": ADMIN, "webapp_url": ""})()
        self.text("/start")
        self.assertEqual(labels(self.api.last()["reply_markup"])[:3], [self.b("lead"), self.b("services"), self.b("faq")])

    def test_contact_from_mini_app_is_not_answered(self):
        n = len(self.api.calls)
        self.bot.handle_update({"update_id": 77, "message": {"message_id": 9, "from": USER, "chat": {"id": USER["id"], "type": "private"},
                                "contact": {"phone_number": "79261234567", "user_id": USER["id"], "first_name": "Анна"}}})
        self.assertEqual(len(self.api.calls), n)

    def test_menu_without_webapp_url_uses_link(self):
        self.bot.cfg = type("C", (), {"admin_chat_id": ADMIN, "webapp_url": ""})()
        self.text("/start")
        self.assertIn(self.b("card"), labels(self.api.last()["reply_markup"]))

    def test_all_services_and_back(self):
        self.press("svc")
        menu = self.api.last()["reply_markup"]
        for item in self.content["services"]["items"]:
            self.press("svc:" + item["key"])
            msg = self.api.last()
            self.assertIn(self.b("lead"), labels(msg["reply_markup"]))
            back = [b for b in buttons(msg["reply_markup"]) if b["text"] == self.b("back")][0]
            self.assertEqual(back["callback_data"], "svc")
        self.assertIn(self.b("menu"), labels(menu))
        self.press("menu")
        self.assertEqual(self.api.last()["text"], self.content["menu_text"].strip())

    def test_all_faq_answers(self):
        self.press("faq")
        for cat in self.content["faq"]["categories"]:
            self.press("faq:" + cat["key"])
            self.assertEqual(len(buttons(self.api.last()["reply_markup"])), len(cat["questions"]) + 2)
            for i, q in enumerate(cat["questions"]):
                self.press("faq:%s:%d" % (cat["key"], i))
                msg = self.api.last()
                self.assertIn(q["q"].replace("<", "&lt;"), msg["text"])
                lbl = labels(msg["reply_markup"])
                for key in ("lead", "write", "back", "menu"):
                    self.assertIn(self.b(key), lbl)

    def test_bad_callback_data_does_not_crash(self):
        for data in ("faq:nope", "faq:sale:99", "faq:sale:x", "svc:nope", "zzz"):
            self.press(data)
        self.assertFalse(any(self.content["error"].strip() == p["text"] for p in self.api.shown()))

    def test_edit_failure_falls_back_to_new_message(self):
        self.api.fail_edit = True
        self.press("faq")
        self.assertEqual(self.api.sent()[-1]["text"], self.content["faq"]["title"].strip())

    def test_callback_data_fits_telegram_limit(self):
        self.press("faq")
        for cat in self.content["faq"]["categories"]:
            self.press("faq:" + cat["key"])
        self.press("svc")
        for p in self.api.shown():
            for b in buttons(p.get("reply_markup")):
                if "callback_data" in b:
                    self.assertLessEqual(len(b["callback_data"].encode()), 64)

    # --- заявка ---
    def test_full_lead_flow_and_notification(self):
        self.full_lead()
        confirm = self.api.last()
        self.assertIn("+7 (926) 123-45-67", confirm["text"])
        self.assertIn("Бутово", confirm["text"])
        self.press("l:send")
        admin = self.api.sent(ADMIN)
        self.assertEqual(len(admin), 1)
        t = admin[0]["text"]
        for part in ("Купить", "Иван", "+7 (926) 123-45-67", "Бутово, до 15 млн", "@ivan_client", "(МСК)"):
            self.assertIn(part, t)
        self.assertIn(self.content["lead"]["done"].strip(), [p["text"] for p in self.api.sent(USER["id"])[-2:]])
        self.assertEqual(self.bot.state.get(USER["id"]), (None, {}))  # заявка не хранится

    def test_name_from_profile_button(self):
        self.press("lead")
        self.press("l:t:sell")
        prompt = self.api.last()
        self.assertEqual(buttons(prompt["reply_markup"])[0], {"text": "Иван", "callback_data": "l:n:tg"})
        self.press("l:n:tg")
        self.assertEqual(self.bot.state.get(USER["id"]), ("consent", self.bot.state.get(USER["id"])[1]))
        self.assertEqual(self.bot.state.get(USER["id"])[1]["name"], "Иван")

    def test_no_profile_button_for_unusable_name(self):
        user = {"id": 778, "first_name": "🔥🔥"}
        self.press("lead", user)
        self.press("l:t:sell", user)
        self.assertEqual(labels(self.api.last()["reply_markup"]), [self.b("cancel")])

    def test_services_two_per_row(self):
        self.press("svc")
        rows = self.api.last()["reply_markup"]["inline_keyboard"]
        self.assertTrue(all(len(r) <= 2 for r in rows))
        self.assertEqual(len(rows[0]), 2)

    def contacts(self):
        return [p for m, p in self.api.calls if m == "sendContact"]

    def test_contact_command_and_deep_link(self):
        self.text("/contact")
        self.text("/start contact")
        sent = self.contacts()
        self.assertEqual(len(sent), 2)
        self.assertEqual(sent[0]["phone_number"], "+79263977775")
        self.assertEqual(sent[0]["last_name"], "Минаев | Риелтор")
        self.assertTrue(sent[0]["vcard"].startswith("BEGIN:VCARD\r\n"))
        self.assertIn("\r\nEND:VCARD", sent[0]["vcard"])

    def test_contact_sent_after_lead(self):
        self.full_lead()
        self.press("l:send")
        self.assertEqual(len(self.contacts()), 1)

    def test_contact_failure_does_not_break_lead(self):
        self.full_lead()
        orig = self.api.call

        def call(method, **p):
            if method == "sendContact":
                self.api.calls.append((method, p))
                raise TelegramError("Bad Request", 400)
            return orig(method, **p)
        self.api.call = call
        with self.assertLogs("bot", level="ERROR"):
            self.press("l:send")
        self.assertEqual(len(self.api.sent(ADMIN)), 1)
        self.assertEqual(self.bot.state.get(USER["id"]), (None, {}))

    def test_skip_comment(self):
        self.full_lead(comment=None)
        self.press("l:send")
        self.assertIn("Комментарий: —", self.api.sent(ADMIN)[0]["text"])

    def test_phone_by_contact_button(self):
        self.press("lead")
        self.press("l:t:sell")
        self.text("Ольга")
        self.press("l:consent:yes")
        phone_prompt = self.api.last()
        self.assertTrue(phone_prompt["reply_markup"]["keyboard"][0][0]["request_contact"])
        self.contact("79261234567")
        self.assertEqual(self.bot.state.get(USER["id"])[1]["phone"], "+79261234567")
        removed = [p for p in self.api.sent() if p.get("reply_markup") == {"remove_keyboard": True}]
        self.assertTrue(removed)

    def test_invalid_phone_rejected(self):
        self.press("lead")
        self.press("l:t:sell")
        self.text("Ольга")
        self.press("l:consent:yes")
        self.text("позвоните мне")
        self.assertEqual(self.api.last()["text"], self.content["lead"]["phone_invalid"].strip())
        self.assertEqual(self.bot.state.get(USER["id"])[0], "phone")

    def test_no_consent_no_phone_request(self):
        self.press("lead")
        self.press("l:t:sell")
        self.text("Ольга")
        self.press("l:consent:no")
        msg = self.api.last()
        self.assertIn(self.b("write"), labels(msg["reply_markup"]))
        self.assertFalse(any("keyboard" in (p.get("reply_markup") or {}) for p in self.api.sent()))
        self.assertEqual(self.bot.state.get(USER["id"]), (None, {}))
        self.text("+79261234567")  # после отказа номер не принимается как заявка
        self.assertEqual(self.api.last()["text"], self.content["fallback"].strip())

    def test_cancel_on_every_step(self):
        steps = [
            lambda: None,
            lambda: self.press("l:t:buy"),
            lambda: self.text("Иван"),
            lambda: self.press("l:consent:yes"),
            lambda: self.text("+7 926 123-45-67"),
            lambda: self.text("комментарий"),
        ]
        for upto in range(len(steps)):
            for how in ("button", "text", "command"):
                self.press("lead")
                for s in steps[1:upto + 1]:
                    s()
                if how == "button":
                    self.press("l:cancel")
                elif how == "text":
                    self.text(self.b("cancel"))
                else:
                    self.text("/cancel")
                self.assertEqual(self.bot.state.get(USER["id"]), (None, {}), (upto, how))
                self.assertEqual(self.api.last()["text"], self.content["menu_text"].strip())
        self.assertEqual(self.api.sent(ADMIN), [])

    def test_edit_field_returns_to_confirm(self):
        self.full_lead()
        self.press("l:edit")
        self.press("l:e:name")
        self.text("Пётр")
        self.assertIn("Пётр", self.api.last()["text"])
        self.press("l:edit")
        self.press("l:e:task")
        self.press("l:t:new")
        self.assertIn("Новостройка", self.api.last()["text"])
        self.press("l:send")
        self.assertIn("Пётр", self.api.sent(ADMIN)[0]["text"])

    def test_admin_failure_tells_client(self):
        self.api.fail_chat = ADMIN
        self.full_lead()
        self.press("l:send")
        msg = self.api.last()
        self.assertEqual(msg["text"], self.content["lead"]["send_failed"].strip())
        self.assertIn(self.b("write"), labels(msg["reply_markup"]))
        self.api.fail_chat = None
        self.press("l:send")  # повторная отправка работает: 1 неудачная попытка + 1 успешная
        self.assertEqual(len(self.api.sent(ADMIN)), 2)
        self.assertIn(self.content["lead"]["done"].strip(), [p["text"] for p in self.api.sent(USER["id"])[-2:]])

    def test_html_in_user_input_is_escaped(self):
        self.full_lead(comment="<b>жирно</b> & <script>")
        self.press("l:send")
        t = self.api.sent(ADMIN)[0]["text"]
        self.assertIn("&lt;script&gt;", t)
        self.assertNotIn("<script>", t)

    def test_username_missing(self):
        user = {"id": 777, "first_name": "Анна"}
        self.press("lead", user)
        self.press("l:t:other", user)
        self.text("Анна", user)
        self.press("l:consent:yes", user)
        self.text("+7 926 000-00-00", user)
        self.press("l:skip", user)
        self.press("l:send", user)
        self.assertIn("tg://user?id=777", self.api.sent(ADMIN)[0]["text"])

    def test_deep_link_start_lead(self):
        self.text("/start lead")
        self.assertEqual(self.bot.state.get(USER["id"])[0], "task")

    def test_text_on_button_step_reminds(self):
        self.press("lead")
        self.text("продать")
        self.assertEqual(self.api.last()["text"], self.content["lead"]["use_buttons"].strip())

    def test_stale_button_after_send(self):
        self.full_lead()
        self.press("l:send")
        self.press("l:send")
        self.assertEqual(len(self.api.sent(ADMIN)), 1)

    def test_free_text_fallback(self):
        self.text("Сколько стоит однушка в Бутово?")
        msg = self.api.last()
        self.assertEqual(msg["text"], self.content["fallback"].strip())
        lbl = labels(msg["reply_markup"])
        for key in ("faq", "write", "menu"):
            self.assertIn(self.b(key), lbl)

    def test_group_chats_ignored(self):
        self.bot.handle_update({"message": {"message_id": 1, "from": USER,
                                            "chat": {"id": -100, "type": "group"}, "text": "/start"}})
        self.assertEqual(self.api.calls, [])

    def test_exception_sends_error_with_write_button(self):
        def boom(*a, **k):
            raise RuntimeError("secret " + "".join(["+7926", "1234567"]))
        self.bot.lead_start = boom
        with self.assertLogs("bot", level="ERROR") as logs:
            self.press("lead")
        msg = self.api.last()
        self.assertEqual(msg["text"], self.content["error"].strip())
        self.assertIn(self.b("write"), labels(msg["reply_markup"]))
        self.assertNotIn("79261234567", "".join(logs.output))


class BusinessTest(unittest.TestCase):
    """Автоответ в личных сообщениях Дмитрия через Telegram Business."""

    def setUp(self):
        self.api = FakeAPI()
        self.content = load(ROOT / "content.yaml")
        self.bot = Bot(self.api, self.content, StateStore(":memory:"), Cfg())

    def connect(self, owner=ADMIN, can_reply=True, enabled=True, conn="bc1", new_rights=False):
        bc = {"id": conn, "user": {"id": owner}, "user_chat_id": owner, "is_enabled": enabled}
        if new_rights:
            bc["rights"] = {"can_reply": can_reply}
        else:
            bc["can_reply"] = can_reply
        self.bot.handle_update({"update_id": 1, "business_connection": bc})

    def biz(self, sender, chat=900, conn="bc1", text="Здравствуйте, продаю квартиру"):
        self.bot.handle_update({"update_id": 2, "business_message": {
            "message_id": 5, "business_connection_id": conn, "from": sender,
            "chat": {"id": chat, "type": "private"}, "text": text}})

    def greetings(self):
        return [p for m, p in self.api.calls if m == "sendMessage" and p.get("business_connection_id")]

    def test_greets_new_client_once_with_buttons(self):
        self.connect()
        self.biz({"id": 900, "first_name": "Анна"})
        self.biz({"id": 900, "first_name": "Анна"}, text="ещё вопрос")
        sent = self.greetings()
        self.assertEqual(len(sent), 1)
        self.assertEqual(sent[0]["chat_id"], 900)
        urls = [b["url"] for b in buttons(sent[0]["reply_markup"])]
        self.assertEqual(urls, ["https://t.me/RealtyMinaev_bot?startapp=lead", "https://t.me/RealtyMinaev_bot?startapp=services",
                                "https://t.me/RealtyMinaev_bot?startapp=card"])
        self.assertEqual(buttons(sent[0]["reply_markup"])[0].get("style"), "primary")
        self.assertNotIn("web_app", str(sent[0]["reply_markup"]))  # в личной переписке web_app-кнопки запрещены

    def test_greeting_uses_name_only_when_it_looks_like_a_name(self):
        self.connect()
        cases = {"Анна": "Здравствуйте, Анна!", "anna": "Здравствуйте, Anna!",
                 "анна-мария": "Здравствуйте, Анна-Мария!", "🏠 Ваня": "Здравствуйте! ",
                 "Квартиры ЦАО": "Здравствуйте! ", "user123": "Здравствуйте! ", "": "Здравствуйте! "}
        for i, (name, hello) in enumerate(cases.items()):
            self.biz({"id": 1000 + i, "first_name": name}, chat=1000 + i)
            text = self.greetings()[-1]["text"]
            self.assertTrue(text.startswith(hello), (name, text))
            self.assertIn("Спасибо за обращение — скоро отвечу лично.", text)

    def test_no_greeting_after_owner_wrote_first(self):
        self.connect()
        self.biz({"id": ADMIN, "first_name": "Дмитрий"}, chat=901)
        self.biz({"id": 901, "first_name": "Олег"}, chat=901)
        self.assertEqual(self.greetings(), [])

    def test_foreign_account_connection_ignored(self):
        self.connect(owner=12345)
        self.api.call = lambda method, **p: {"id": "bc1", "user": {"id": 12345}, "can_reply": True, "is_enabled": True}
        self.biz({"id": 900, "first_name": "Анна"})
        self.assertIsNone(self.bot.state.get_business("bc1"))

    def test_no_reply_rights_or_disabled(self):
        self.connect(can_reply=False)
        self.biz({"id": 900, "first_name": "Анна"})
        self.connect(conn="bc2", enabled=False)
        self.biz({"id": 902, "first_name": "Иван"}, chat=902, conn="bc2")
        self.assertEqual(self.greetings(), [])

    def test_new_style_rights_field(self):
        self.connect(new_rights=True)
        self.biz({"id": 900, "first_name": "Анна"})
        self.assertEqual(len(self.greetings()), 1)

    def test_connection_made_before_launch_is_fetched(self):
        orig = self.api.call

        def call(method, **p):
            if method == "getBusinessConnection":
                self.api.calls.append((method, p))
                return {"id": p["business_connection_id"], "user": {"id": ADMIN}, "can_reply": True, "is_enabled": True}
            return orig(method, **p)
        self.api.call = call
        self.biz({"id": 900, "first_name": "Анна"}, conn="old")
        self.assertEqual(len(self.greetings()), 1)

    def test_greeting_failure_is_silent(self):
        self.connect()
        self.api.fail_chat = 900
        with self.assertLogs("bot", level="ERROR"):
            self.biz({"id": 900, "first_name": "Анна"})
        self.assertEqual([p for m, p in self.api.calls if m == "sendMessage" and p["chat_id"] == 900 and not p.get("business_connection_id")], [])

    def test_message_text_not_stored(self):
        self.connect()
        self.biz({"id": 900, "first_name": "Анна"}, text="мой телефон 89261234567")
        dump = "\n".join(self.bot.state._conn.iterdump())
        self.assertNotIn("89261234567", dump)
        self.assertNotIn("Анна", dump)


class BannerTest(unittest.TestCase):
    def setUp(self):
        self.api = FakeAPI()
        self.content = load(ROOT / "content.yaml")
        cfg = type("C", (), {"admin_chat_id": ADMIN, "webapp_url": "https://x/app/",
                             "banner_path": str(ROOT / "assets" / "banner.jpg")})()
        self.bot = Bot(self.api, self.content, StateStore(":memory:"), cfg)

    def start(self):
        self.bot.handle_update({"update_id": 1, "message": {"message_id": 1, "from": USER,
                                "chat": {"id": USER["id"], "type": "private"}, "text": "/start"}})

    def test_banner_uploaded_once_then_reused(self):
        self.start()
        self.start()
        photos = [(m, p) for m, p in self.api.calls if m == "sendPhoto"]
        self.assertEqual(len(photos), 2)
        self.assertIn("_file", photos[0][1])
        self.assertEqual(photos[1][1]["photo"], "BIG")
        self.assertIn("Дмитрий Минаев", photos[0][1]["caption"])

    def test_banner_by_url_through_relay(self):
        self.bot.cfg.banner_url = "https://relay.example/banner.jpg"
        self.start()
        photo = [p for m, p in self.api.calls if m == "sendPhoto"][0]
        self.assertEqual(photo["photo"], "https://relay.example/banner.jpg")
        self.assertNotIn("_file", photo)
        self.start()
        self.assertEqual([p for m, p in self.api.calls if m == "sendPhoto"][1]["photo"], "BIG")

    def test_menu_on_photo_edits_caption(self):
        self.bot.handle_update({"update_id": 2, "callback_query": {"id": "1", "from": USER, "data": "svc",
            "message": {"message_id": 5, "chat": {"id": USER["id"], "type": "private"}, "photo": [{"file_id": "BIG"}]}}})
        methods = [m for m, p in self.api.calls]
        self.assertIn("editMessageCaption", methods)
        self.assertNotIn("editMessageText", methods)

    def test_upload_failure_falls_back_to_text(self):
        self.api.fail_upload = True
        with self.assertLogs("bot", level="ERROR"):
            self.start()
        self.assertIn("Дмитрий Минаев", self.api.sent(USER["id"])[-1]["text"])


class PhoneTest(unittest.TestCase):
    def test_formats(self):
        ok = {
            "+7 926 123-45-67": "+79261234567", "89261234567": "+79261234567",
            "8 (926) 123 45 67": "+79261234567", "9261234567": "+79261234567",
            "+375 29 123-45-67": "+375291234567",
        }
        for raw, exp in ok.items():
            self.assertEqual(normalize_phone(raw), exp, raw)
        for raw in ("123", "abc", "+7 926 123", "тел 89261234567", "", "1234567890123456"):
            self.assertIsNone(normalize_phone(raw), raw)


class ContentTest(unittest.TestCase):
    def test_faq_answer_too_long_rejected(self):
        import yaml
        data = yaml.safe_load((ROOT / "content.yaml").read_text(encoding="utf-8"))
        data["faq"]["categories"][0]["questions"][0]["a"] = "а" * 601
        with self.assertRaises(ContentError):
            validate(data)

    def test_bare_angle_bracket_rejected(self):
        import yaml
        data = yaml.safe_load((ROOT / "content.yaml").read_text(encoding="utf-8"))
        data["welcome"] = "цена < рынка"
        with self.assertRaises(ContentError):
            validate(data)


class WebhookTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        env = Path(self.tmp.name) / ".env"
        env.write_text("", encoding="utf-8")
        for k in ("BOT_TOKEN", "ADMIN_CHAT_ID", "WEBHOOK_SECRET", "WEBHOOK_PATH", "STATE_DB", "LOG_FILE"):
            os.environ.pop(k, None)
        os.environ.update({
            "BOT_TOKEN": "123:TEST", "ADMIN_CHAT_ID": str(ADMIN), "WEBHOOK_SECRET": "s3cret-value",
            "STATE_DB": ":memory:", "LOG_FILE": str(Path(self.tmp.name) / "err.log"),
        })
        cfg = Config(env)
        self.api = FakeAPI()
        app_mod._cfg = cfg
        app_mod._bot = Bot(self.api, load(ROOT / "content.yaml"), StateStore(":memory:"), cfg)

    def tearDown(self):
        app_mod._bot = app_mod._cfg = None
        self.tmp.cleanup()

    def request(self, path="/webhook", method="POST", secret="s3cret-value", body=None):
        raw = json.dumps(body if body is not None else {
            "update_id": 1, "message": {"message_id": 1, "from": USER,
                                        "chat": {"id": USER["id"], "type": "private"}, "text": "/start"}}).encode()
        environ = {"PATH_INFO": path, "REQUEST_METHOD": method, "CONTENT_LENGTH": str(len(raw)),
                   "wsgi.input": io.BytesIO(raw)}
        if secret is not None:
            environ["HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN"] = secret
        status = []
        app_mod.application(environ, lambda s, h: status.append(s))
        return status[0]

    def test_valid_secret(self):
        self.assertEqual(self.request(), "200 OK")
        self.assertEqual(len([m for m, p in self.api.calls if m in ("sendMessage", "sendPhoto")]), 1)

    def test_wrong_or_missing_secret(self):
        self.assertEqual(self.request(secret="wrong"), "403 Forbidden")
        self.assertEqual(self.request(secret=None), "403 Forbidden")
        self.assertEqual(self.api.calls, [])

    def test_other_paths(self):
        self.assertEqual(self.request(path="/"), "404 Not Found")
        self.assertEqual(self.request(method="GET"), "404 Not Found")
        self.assertEqual(self.request(path="/health", method="GET"), "200 OK")


if __name__ == "__main__":
    unittest.main()


class AppDataTest(unittest.TestCase):
    def test_export_matches_bot_texts(self):
        import manage
        c = load(ROOT / "content.yaml")
        d = manage.app_data(c)
        self.assertEqual(len(d["services"]), len(c["services"]["items"]))
        self.assertEqual(sum(len(x["q"]) for x in d["faq"]), sum(len(x["questions"]) for x in c["faq"]["categories"]))
        self.assertEqual(d["tasks"], [t["button"] for t in c["lead"]["tasks"]])
        self.assertNotIn("<", json.dumps(d, ensure_ascii=False))
