"""Логика бота: меню, услуги, частые вопросы, заявка.

Все тексты и подписи кнопок — в content.yaml. Здесь только порядок шагов.
"""
import html
import logging
import re
import traceback
from datetime import datetime, timedelta, timezone

from .telegram import TelegramError

log = logging.getLogger("bot")
MSK = timezone(timedelta(hours=3), "MSK")

# шаги заявки
TASK, NAME, CONSENT, PHONE, COMMENT, CONFIRM, EDIT = (
    "task", "name", "consent", "phone", "comment", "confirm", "edit",
)
NAME_MAX = 60
COMMENT_MAX = 1000


def normalize_phone(raw):
    """Возвращает номер в виде +7XXXXXXXXXX (или +цифры для других стран) либо None."""
    raw = (raw or "").strip()
    if re.search(r"[^\d\s()+\-.]", raw):
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits[0] in "78":
        return "+7" + digits[1:]
    if len(digits) == 10 and digits[0] == "9" and not raw.startswith("+"):
        return "+7" + digits
    if raw.startswith("+") and 10 <= len(digits) <= 15 and not digits.startswith("7"):
        return "+" + digits
    return None


def format_phone(phone):
    if phone.startswith("+7") and len(phone) == 12:
        d = phone[2:]
        return "+7 (%s) %s-%s-%s" % (d[:3], d[3:6], d[6:8], d[8:])
    return phone


def profile_name(user):
    """Имя из профиля Telegram для кнопки «назваться одним нажатием»."""
    name = (user.get("first_name") or "").strip()
    if not name or len(name) > NAME_MAX or not re.search(r"[^\W\d_]", name):
        return ""
    return name[:30]


def esc(text):
    return html.escape(text or "", quote=False)


class Bot:
    def __init__(self, api, content, state, config):
        self.api = api
        self.c = content
        self.state = state
        self.cfg = config

    # ---------- вход ----------

    def handle_update(self, update):
        chat_id = None
        try:
            if "message" in update:
                msg = update["message"]
                chat_id = msg["chat"]["id"]
                if msg["chat"].get("type") != "private":
                    return
                self.on_message(msg)
            elif "callback_query" in update:
                cq = update["callback_query"]
                chat_id = (cq.get("message") or {}).get("chat", {}).get("id")
                self.on_callback(cq)
            elif "business_connection" in update:
                self.on_business_connection(update["business_connection"])
            elif "business_message" in update:
                # ошибки в личных чатах владельца клиенту не показываем
                return self.on_business_message(update["business_message"])
        except Exception as e:  # бот не должен молчать
            # в лог — только тип ошибки и стек, без текста сообщений и данных клиента
            log.error("update failed: %s\n%s", type(e).__name__, "".join(traceback.format_tb(e.__traceback__)))
            if chat_id:
                try:
                    self.send(chat_id, self.c["error"], self.kb([[self.btn_write()]]))
                except Exception:
                    log.error("error message not sent")

    # ---------- клавиатуры ----------

    def b(self, key):
        return self.c["buttons"][key]

    @staticmethod
    def kb(rows):
        return {"inline_keyboard": rows}

    @staticmethod
    def pairs(buttons):
        """Кнопки по две в ряд — удобно на экране телефона."""
        return [buttons[i:i + 2] for i in range(0, len(buttons), 2)]

    def cb(self, key, data):
        return {"text": self.b(key), "callback_data": data}

    def url(self, key, link):
        return {"text": self.b(key), "url": link}

    def btn_write(self):
        return self.url("write", self.c["links"]["dmitry"])

    def btn_menu(self):
        return self.cb("menu", "menu")

    def btn_cancel(self):
        return self.cb("cancel", "l:cancel")

    def main_menu(self):
        links = self.c["links"]
        if self.cfg.webapp_url:
            card = {"text": self.b("card"), "web_app": {"url": self.cfg.webapp_url}}
        else:
            card = self.url("card", links["card_fallback"])
        return self.kb([
            [card],
            [self.cb("services", "svc"), self.cb("faq", "faq")],
            [self.cb("lead", "lead")],
            [self.url("site", links["site"])],
        ])

    # ---------- отправка ----------

    def send(self, chat_id, text, markup=None):
        return self.api.call(
            "sendMessage", chat_id=chat_id, text=text.strip(), parse_mode="HTML",
            reply_markup=markup, link_preview_options={"is_disabled": True},
        )

    def show(self, cq, text, markup):
        """Меняет текущее сообщение; если нельзя — присылает новое."""
        msg = cq.get("message") or {}
        try:
            self.api.call(
                "editMessageText", chat_id=msg["chat"]["id"], message_id=msg["message_id"],
                text=text.strip(), parse_mode="HTML", reply_markup=markup,
                link_preview_options={"is_disabled": True},
            )
        except (TelegramError, KeyError) as e:
            if isinstance(e, TelegramError) and "not modified" in e.description:
                return
            self.send(cq["from"]["id"], text, markup)

    # ---------- сообщения ----------

    def on_message(self, msg):
        uid = msg["from"]["id"]
        text = (msg.get("text") or "").strip()

        if text.startswith("/"):
            cmd, _, payload = text.partition(" ")
            cmd = cmd.split("@")[0].lower()
            if cmd == "/start":
                self.state.clear(uid)
                if payload.strip() == "lead":
                    return self.lead_start(msg["from"])
                if payload.strip() == "contact":
                    return self.send_contact(uid)
                return self.send(uid, self.c["welcome"], self.main_menu())
            if cmd == "/menu":
                return self.send(uid, self.c["menu_text"], self.main_menu())
            if cmd == "/lead":
                return self.lead_start(msg["from"])
            if cmd == "/cancel":
                return self.lead_cancel(uid)
            if cmd == "/contact":
                return self.send_contact(uid)

        step, data = self.state.get(uid)
        if step is None:
            return self.send(uid, self.c["fallback"], self.kb([
                [self.cb("faq", "faq"), self.btn_write()], [self.btn_menu()],
            ]))
        if text == self.b("cancel"):  # кнопка «Отмена» под полем ввода на шаге телефона
            return self.lead_cancel(uid)
        if step == NAME:
            return self.lead_name(uid, data, text)
        if step == PHONE:
            return self.lead_phone(uid, data, msg)
        if step == COMMENT:
            return self.lead_comment(uid, data, text, msg)
        # на остальных шагах ждём нажатия кнопки
        self.send(uid, self.c["lead"]["use_buttons"], self.kb([[self.btn_cancel()]]))

    # ---------- кнопки ----------

    def on_callback(self, cq):
        uid = cq["from"]["id"]
        data = cq.get("data") or ""
        try:
            self.api.call("answerCallbackQuery", callback_query_id=cq["id"])
        except TelegramError:
            pass  # кнопка устарела — всё равно обрабатываем нажатие

        if data == "menu":
            return self.show(cq, self.c["menu_text"], self.main_menu())
        if data == "svc":
            return self.show_services(cq)
        if data.startswith("svc:"):
            return self.show_service(cq, data[4:])
        if data == "faq":
            return self.show_faq(cq)
        if data.startswith("faq:"):
            parts = data.split(":")
            if len(parts) == 2:
                return self.show_category(cq, parts[1])
            return self.show_answer(cq, parts[1], parts[2])
        if data == "lead":
            return self.lead_start(cq["from"])
        if data.startswith("l:"):
            return self.lead_callback(uid, data[2:])
        self.show(cq, self.c["menu_text"], self.main_menu())

    def show_services(self, cq):
        items = self.c["services"]["items"]
        rows = self.pairs([{"text": s["button"], "callback_data": "svc:" + s["key"]} for s in items])
        rows.append([self.btn_menu()])
        self.show(cq, self.c["services"]["title"], self.kb(rows))

    def show_service(self, cq, key):
        s = self.c.service(key)
        if not s:
            return self.show_services(cq)
        rows = [[self.cb("lead", "lead")]]
        if s.get("url"):
            rows.append([self.url("more_on_site", s["url"])])
        rows.append([self.cb("back", "svc"), self.btn_menu()])
        self.show(cq, s["text"].strip(), self.kb(rows))

    def show_faq(self, cq):
        cats = self.c["faq"]["categories"]
        rows = self.pairs([{"text": c["button"], "callback_data": "faq:" + c["key"]} for c in cats])
        rows.append([self.btn_menu()])
        self.show(cq, self.c["faq"]["title"], self.kb(rows))

    def show_category(self, cq, key):
        cat = self.c.category(key)
        if not cat:
            return self.show_faq(cq)
        rows = [
            [{"text": q.get("button") or q["q"], "callback_data": "faq:%s:%d" % (key, i)}]
            for i, q in enumerate(cat["questions"])
        ]
        rows.append([self.cb("back", "faq"), self.btn_menu()])
        self.show(cq, "<b>%s</b>" % esc(cat["title"]), self.kb(rows))

    def show_answer(self, cq, key, index):
        cat = self.c.category(key)
        if not cat or not index.isdigit() or int(index) >= len(cat["questions"]):
            return self.show_faq(cq)
        q = cat["questions"][int(index)]
        text = "<b>%s</b>\n\n%s" % (esc(q["q"]), q["a"].strip())
        self.show(cq, text, self.kb([
            [self.cb("lead", "lead")],
            [self.btn_write()],
            [self.cb("back", "faq:" + key), self.btn_menu()],
        ]))

    # ---------- заявка ----------

    def lead_start(self, user):
        uid = user["id"]
        self.state.set(uid, TASK, {
            "username": user.get("username") or "",
            "tg_name": profile_name(user),
        })
        self.ask_task(uid)

    def ask_task(self, uid):
        tasks = self.c["lead"]["tasks"]
        rows = self.pairs([{"text": t["button"], "callback_data": "l:t:" + t["key"]} for t in tasks])
        rows.append([self.btn_cancel()])
        self.send(uid, self.c["lead"]["task_prompt"], self.kb(rows))

    def ask_name(self, uid, data=None):
        rows = []
        tg_name = (data or {}).get("tg_name")
        if tg_name:
            rows.append([{"text": tg_name, "callback_data": "l:n:tg"}])
        rows.append([self.btn_cancel()])
        self.send(uid, self.c["lead"]["name_prompt"], self.kb(rows))

    def ask_consent(self, uid):
        links = self.c["links"]
        text = (self.c["lead"]["consent_prompt"]
                .replace("{privacy_url}", links["privacy"]).replace("{consent_url}", links["consent"]))
        self.send(uid, text, self.kb([
            [self.cb("consent_yes", "l:consent:yes"), self.cb("consent_no", "l:consent:no")],
            [self.btn_cancel()],
        ]))

    def ask_phone(self, uid):
        self.send(uid, self.c["lead"]["phone_prompt"], {
            "keyboard": [
                [{"text": self.b("share_phone"), "request_contact": True}],
                [{"text": self.b("cancel")}],
            ],
            "resize_keyboard": True,
            "one_time_keyboard": True,
            "input_field_placeholder": "+7 900 000-00-00",
        })

    def ask_comment(self, uid):
        self.send(uid, self.c["lead"]["comment_prompt"], self.kb([
            [self.cb("skip", "l:skip")], [self.btn_cancel()],
        ]))

    def ask_confirm(self, uid, data):
        lead = self.c["lead"]
        text = lead["confirm"].format(
            task=esc(self.c.task_label(data.get("task"))),
            name=esc(data.get("name")),
            phone=esc(format_phone(data.get("phone", ""))),
            comment=esc(data.get("comment")) or lead["no_comment"],
        )
        self.send(uid, text, self.kb([
            [self.cb("send", "l:send")],
            [self.cb("edit", "l:edit"), self.btn_cancel()],
        ]))

    def next_after(self, uid, data, step_done):
        """Переход к следующему шагу. Если клиент правит одно поле — сразу к подтверждению."""
        if data.get("editing"):
            data.pop("editing")
            self.state.set(uid, CONFIRM, data)
            return self.ask_confirm(uid, data)
        order = {TASK: NAME, NAME: CONSENT, CONSENT: PHONE, PHONE: COMMENT, COMMENT: CONFIRM}
        nxt = order[step_done]
        self.state.set(uid, nxt, data)
        if nxt == NAME:
            self.ask_name(uid, data)
        elif nxt == CONSENT:
            self.ask_consent(uid)
        elif nxt == PHONE:
            self.ask_phone(uid)
        elif nxt == COMMENT:
            self.ask_comment(uid)
        else:
            self.ask_confirm(uid, data)

    def lead_name(self, uid, data, text):
        if not text or len(text) > NAME_MAX or text.startswith("/") or not re.search(r"[^\W\d_]", text):
            return self.send(uid, self.c["lead"]["name_invalid"], self.kb([[self.btn_cancel()]]))
        data["name"] = text
        self.next_after(uid, data, NAME)

    def lead_phone(self, uid, data, msg):
        contact = msg.get("contact")
        phone = normalize_phone(contact.get("phone_number", "") if contact else msg.get("text", ""))
        if contact and not phone:
            digits = re.sub(r"\D", "", contact.get("phone_number", ""))
            phone = "+" + digits if 10 <= len(digits) <= 15 else None
        if not phone:
            return self.send(uid, self.c["lead"]["phone_invalid"])
        data["phone"] = phone
        # убираем клавиатуру «Поделиться номером»
        self.send(uid, self.c["lead"]["phone_saved"], {"remove_keyboard": True})
        self.next_after(uid, data, PHONE)

    def lead_comment(self, uid, data, text, msg):
        if not text:
            return self.send(uid, self.c["lead"]["comment_prompt"], self.kb([
                [self.cb("skip", "l:skip")], [self.btn_cancel()],
            ]))
        if len(text) > COMMENT_MAX:
            return self.send(uid, self.c["lead"]["comment_too_long"], self.kb([
                [self.cb("skip", "l:skip")], [self.btn_cancel()],
            ]))
        data["comment"] = text
        self.next_after(uid, data, COMMENT)

    def lead_cancel(self, uid):
        self.state.clear(uid)
        self.send(uid, self.c["lead"]["cancelled"], {"remove_keyboard": True})
        self.send(uid, self.c["menu_text"], self.main_menu())

    def lead_callback(self, uid, action):
        if action == "cancel":
            return self.lead_cancel(uid)
        step, data = self.state.get(uid)
        if step is None:  # черновик истёк или уже отправлен
            return self.send(uid, self.c["menu_text"], self.main_menu())

        if action.startswith("t:") and step in (TASK, EDIT):
            data["task"] = action[2:]
            return self.next_after(uid, data, TASK)
        if action == "n:tg" and step == NAME and data.get("tg_name"):
            data["name"] = data["tg_name"]
            return self.next_after(uid, data, NAME)
        if action.startswith("consent:") and step == CONSENT:
            if action.endswith(":yes"):
                data["consent_at"] = datetime.now(MSK).strftime("%d.%m.%Y %H:%M")
                return self.next_after(uid, data, CONSENT)
            self.state.clear(uid)
            return self.send(uid, self.c["lead"]["consent_declined"], self.kb([
                [self.btn_write()], [self.btn_menu()],
            ]))
        if action == "skip" and step == COMMENT:
            data["comment"] = ""
            return self.next_after(uid, data, COMMENT)
        if action == "send" and step == CONFIRM:
            return self.lead_send(uid, data)
        if action == "edit" and step == CONFIRM:
            self.state.set(uid, EDIT, data)
            return self.send(uid, self.c["lead"]["edit_prompt"], self.kb([
                [self.cb("edit_task", "l:e:task"), self.cb("edit_name", "l:e:name")],
                [self.cb("edit_phone", "l:e:phone"), self.cb("edit_comment", "l:e:comment")],
                [self.cb("back", "l:e:back")],
            ]))
        if action.startswith("e:") and step == EDIT:
            field = action[2:]
            if field == "back":
                self.state.set(uid, CONFIRM, data)
                return self.ask_confirm(uid, data)
            data["editing"] = True
            target, ask = {
                "task": (TASK, self.ask_task), "name": (NAME, lambda u: self.ask_name(u, data)),
                "phone": (PHONE, self.ask_phone), "comment": (COMMENT, self.ask_comment),
            }.get(field, (None, None))
            if target:
                self.state.set(uid, target, data)
                return ask(uid)
        # кнопка от старого шага — напоминаем, где клиент сейчас
        self.send(uid, self.c["lead"]["use_buttons"], self.kb([[self.btn_cancel()]]))

    def lead_send(self, uid, data):
        lead = self.c["lead"]
        text = lead["admin_message"].format(
            task=esc(self.c.task_label(data.get("task"))),
            name=esc(data.get("name")),
            phone=esc(format_phone(data.get("phone", ""))),
            comment=esc(data.get("comment")) or "—",
            username=self._username(uid, data),
            time=datetime.now(MSK).strftime("%d.%m.%Y %H:%M"),
            consent_time=esc(data.get("consent_at", "")),
        )
        try:
            self.send(self.cfg.admin_chat_id, text)
        except TelegramError as e:
            log.error("lead not delivered to admin: %s", e.code)
            return self.send(uid, lead["send_failed"], self.kb([
                [self.cb("retry", "l:send")], [self.btn_write()],
            ]))
        self.state.clear(uid)  # после отправки заявку не храним
        self.send(uid, lead["done"], self.kb([[self.btn_menu()]]))
        try:
            self.send_contact(uid)  # чтобы клиент узнал номер, когда вы перезвоните
        except TelegramError as e:
            log.error("contact not sent: %s", e.code)

    def _username(self, uid, data):
        name = data.get("username")
        if name:
            return "@" + esc(name)
        return '<a href="tg://user?id=%d">профиль</a> (username не указан)' % uid

    # ---------- Telegram Business: автоответ в личных сообщениях ----------

    def _business_rights(self, bc):
        rights = bc.get("rights") or {}
        return bool(bc.get("can_reply") or rights.get("can_reply"))

    def on_business_connection(self, bc):
        owner = (bc.get("user") or {}).get("id")
        if owner != self.cfg.admin_chat_id:
            return  # к боту подключился чужой аккаунт — не работаем на него
        self.state.set_business(bc["id"], owner, self._business_rights(bc), bc.get("is_enabled", True))

    def _business_owner(self, conn_id):
        known = self.state.get_business(conn_id)
        if known is None:
            # подключение было сделано до запуска бота — спрашиваем у Telegram
            bc = self.api.call("getBusinessConnection", business_connection_id=conn_id)
            self.on_business_connection(bc)
            known = self.state.get_business(conn_id)
        return known

    def on_business_message(self, msg):
        try:
            conn_id = msg.get("business_connection_id")
            if not conn_id or (msg.get("chat") or {}).get("type") != "private":
                return
            known = self._business_owner(conn_id)
            if not known:
                return
            owner, can_reply, enabled = known
            if owner != self.cfg.admin_chat_id or not (can_reply and enabled):
                return
            chat_id = msg["chat"]["id"]
            sender = msg.get("from") or {}
            salt = getattr(self.cfg, "webhook_secret", "") or str(owner)
            if sender.get("id") == owner:
                # вы уже пишете в этот чат сами — автоответ там не нужен
                self.state.mark_greeted(salt, chat_id)
                return
            if sender.get("is_bot") or self.state.was_greeted(salt, chat_id):
                return
            biz = self.c["business"]
            links = self.c["links"]
            self.api.call(
                "sendMessage", business_connection_id=conn_id, chat_id=chat_id,
                text=biz["greeting"].strip(), parse_mode="HTML",
                link_preview_options={"is_disabled": True},
                reply_markup=self.kb([
                    [{"text": self.b("biz_menu"), "url": links["bot"] + "?start=menu"}],
                    [{"text": self.b("biz_lead"), "url": links["bot"] + "?start=lead"}],
                    [{"text": self.b("biz_card"), "url": links["card_fallback"]}],
                ]),
            )
            self.state.mark_greeted(salt, chat_id)
        except Exception as e:
            log.error("business message failed: %s\n%s", type(e).__name__, "".join(traceback.format_tb(e.__traceback__)))

    # ---------- контакт Дмитрия ----------

    def send_contact(self, uid):
        """Присылает карточку контакта — в Telegram у неё есть кнопка «Добавить в контакты»."""
        c = self.c["contact"]
        self.send(uid, c["intro"])
        self.api.call(
            "sendContact", chat_id=uid, phone_number=c["phone"],
            first_name=c["first_name"], last_name=c.get("last_name") or None,
            vcard=c["vcard"].replace("\n", "\r\n").strip() + "\r\n",
        )
