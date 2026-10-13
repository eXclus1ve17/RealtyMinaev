# Telegram-бот: фаза 1 — диагностика (13.10.2026)

## Выяснено
- realtyminaev.ru отдаёт только статику (nginx): `/lead.php` возвращается исходником
  (`application/octet-stream`), POST → 405. Серверный код (PHP/Python) сейчас не выполняется,
  форма заявок на сайте, вероятно, не доставляет заявки.
- `/card` на сайте отсутствует (404), в репозитории тоже нет.
- Репозиторий отстаёт от живого сайта: нет `/uslugi/`, `/kontakty/`, `/politika-konfidencialnosti/`,
  `/soglasie/`, `/assets/`, `lead.php`.
- Политика ПД опубликована (ред. 09.10.2026), оператор — ИП Минаев Д. М.

## Хостинг (по скриншоту, 13.10.2026)
- Тариф reg.ru **Host-Lite** (u3642864), до 11.11.2026. По reg.ru: без PHP, MySQL, Perl, Python и SSH —
  только статика. Бот на нём невозможен; это же причина неработающей формы `lead.php`.
- Домен на NS reg.ru, SSL DomainSSL до 29.03.2027.

## Визитка (архив card-v16)
- `card/` — визитка, `card/app/` — версия под Mini App: SDK подключён, есть ready/expand,
  openTelegramLink/openLink, цвет шапки #0b0a09. Нет: Instagram, канала, «Оставить заявку».
- `card/.htaccess` — редирект `/card/contact` → `minaev.vcf`; на Host-Lite .htaccess может не работать.
- `telegram-vizitka`: `send_card.py` (токен вводится при запуске, не хранится), card.jpg/mp4, thumb.jpg.
- В файлах визитки стоит третья ссылка MAX (`…cOIN_JlMANAm…`) — заменить на утверждённую.

## Решения Дмитрия
- Mini App строится на файлах `/card`, которые пришлёт Дмитрий.
- Ссылка MAX (актуальная): https://max.ru/u/f9LHodD0cOIltzRMQJNb39zW9yZ9WcLlab7stUpLHNshn4GacqhY7h7xSKM
  — на сайте стоит устаревшая, её нужно заменить.
- Политику ПД не дублировать: дополнить `/politika-konfidencialnosti/` и `/soglasie/` разделом про бота.
- Неработающую форму сайта разбираем вместе с проверкой хостинга.

## Ожидается от Дмитрия
- Скриншоты reg.ru: список услуг и карточка хостинга (тариф, панель, SSH).
- Актуальная папка `realtyminaev-site` и файлы `/card`.
- chat_id (через @userinfobot), имя и username бота. Токен в чат не присылать.
