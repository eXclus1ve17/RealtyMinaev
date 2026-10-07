# Выкладка realtyminaev.ru на Рег.ру

## 1. Что загрузить на хостинг

В папку сайта на хостинге (обычно `www/realtyminaev.ru/`) загрузите с заменой:

| Что | Зачем |
|---|---|
| `index.html`, `404.html`, `robots.txt`, `sitemap.xml` | главная и служебные файлы |
| `.htaccess` | редиректы www → без www и /index.html → / |
| `consent.js`, `lead.js` | cookie-согласие, Метрика, форма заявки |
| `send.php` | приём заявок |
| папки `prodat-kvartiru/`, `kupit-kvartiru/`, `novostrojki/`, `kommercheskaya-nedvizhimost/`, `zagorodnaya-nedvizhimost/`, `slozhnye-sdelki/` | новые страницы |
| папки `privacy/`, `soglasie/` | политика и согласие на обработку ПД |
| папка `forma-96/` (только `index.html`) | обновлённый подвал и форма |

**Не загружайте:** `_build/`, `README.md`, `DEPLOY.md`, `.gitignore`, `send-config.example.php`.

**Удалите с хостинга** файл `Google` (без расширения), если он там есть.

## 2. Настроить форму заявки (один раз)

### Telegram-бот
1. В Telegram откройте **@BotFather** → `/newbot` → придумайте имя и адрес бота (например, `realtyminaev_leads_bot`).
2. BotFather пришлёт **токен** вида `1234567890:AAH...`. Никому его не пересылайте.
3. Откройте своего бота и нажмите **Start** (напишите ему любое сообщение).
4. В браузере откройте `https://api.telegram.org/bot<ТОКЕН>/getUpdates` (вместо `<ТОКЕН>` — ваш токен).
   В ответе найдите `"chat":{"id":123456789` — это ваш **chat_id**.

### Файл настроек
1. На хостинге, рядом с `send.php`, создайте файл `send-config.php`
   (можно скопировать `send-config.example.php` и переименовать).
2. Впишите токен, chat_id и почту:
   ```php
   <?php
   return [
       'tg_token'   => 'ВАШ_ТОКЕН',
       'tg_chat_id' => 'ВАШ_CHAT_ID',
       'mail_to'    => 'MinaevDmitry@gmail.com',
       'mail_from'  => 'noreply@realtyminaev.ru',
   ];
   ```
3. В панели Рег.ру создайте почтовый ящик `noreply@realtyminaev.ru` — с него сайт отправляет копии заявок.
   Первые письма в Gmail могут попасть в «Спам»: отметьте «Не спам».

Если Telegram и почта одновременно недоступны, заявка не теряется: она дописывается в файл
`realtyminaev-leads.log` уровнем выше папки сайта.

### Проверка
Откройте сайт → «Хочу продать» → «Оценить квартиру бесплатно» → отправьте тестовую заявку.
Она должна прийти в Telegram и на почту.

## 3. Проверить после выкладки

- `https://www.realtyminaev.ru/` → должен открыться `https://realtyminaev.ru/` (одним переходом).
- `http://realtyminaev.ru/` → `https://realtyminaev.ru/`. Если нет — в панели Рег.ру включите «Перенаправление на HTTPS» в настройках SSL.
- `https://realtyminaev.ru/index.html` → `https://realtyminaev.ru/`.
- Внизу страницы появляется баннер cookie; после «Принять» Метрика начинает считать.
- Если сайт перестал открываться — удалите `.htaccess` и напишите мне.

## 4. Яндекс.Метрика: цели

Метрика → Настройка → Цели → **Добавить цель** → тип «JavaScript-событие», идентификатор:

| Идентификатор | Что считает |
|---|---|
| `lead` | **заявка отправлена** — главная цель |
| `lead_open` | открыли форму заявки |
| `contact` | любой клик по телефону или мессенджеру |
| `call` | клик по телефону |
| `write_telegram` / `write_whatsapp` / `write_max` | клик по мессенджеру |
| `forma96_strip` | переход к проекту Forma 96 с главной |

## 5. Яндекс.Вебмастер

1. **Индексирование → Файлы Sitemap**: проверьте, что `https://realtyminaev.ru/sitemap.xml` добавлен.
2. **Индексирование → Переобход страниц**: добавьте главную и 6 новых страниц:
   ```
   https://realtyminaev.ru/
   https://realtyminaev.ru/prodat-kvartiru/
   https://realtyminaev.ru/kupit-kvartiru/
   https://realtyminaev.ru/novostrojki/
   https://realtyminaev.ru/kommercheskaya-nedvizhimost/
   https://realtyminaev.ru/zagorodnaya-nedvizhimost/
   https://realtyminaev.ru/slozhnye-sdelki/
   https://realtyminaev.ru/forma-96/
   ```

## 6. Как править тексты новых страниц

Тексты лежат в `_build/pages.py`. После правки запустите из корня репозитория:

```
python3 _build/build.py
```

и загрузите на хостинг изменённые папки страниц и `sitemap.xml`.
Стили, подвал и мобильная панель берутся с главной автоматически.
