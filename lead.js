/* ============================================================
   Заявка с сайта — модальное окно, общее для всех страниц.

   Открывается любым элементом с атрибутом data-lead="<тема>":
     sell     — продажа (с полями адреса и площади: это оценка квартиры)
     second   — покупка вторички
     new      — новостройка
     comm     — коммерция
     country  — загородная
     complex  — сложная ситуация
     general  — общий вопрос
   Без JS такая ссылка ведёт по своему href (Telegram) — заявка не теряется.

   Отправка: POST /send.php → Telegram-бот и почта (см. send.php).
   Цели Метрики: lead_open — открыли форму, lead — заявка ушла.
   ============================================================ */
(function () {
  'use strict';

  var COUNTER = 112500819;
  var PHONE_TEL = '+79263977775';
  var PHONE_TXT = '+7 (926) 397-77-75';
  var TG = 'https://t.me/RealtyMinaev';
  var WA = 'https://wa.me/79263977775';
  var MAX = 'https://max.ru/u/f9LHodD0cOLOddl8uSfAqW5N_rbCdWMLwxxzn1UOibarOU6eByK8-xW5caw';

  var TOPICS = {
    sell:    { t: 'Оценю квартиру бесплатно', s: 'Посмотрю цены реальных закрытых сделок в вашем доме и районе и отвечу в течение дня.', est: true, msg: 'Что ещё важно: доля, ипотека, наследство, сроки' },
    second:  { t: 'Подберу и проверю квартиру', s: 'Опишите, что ищете, или пришлите ссылку на объявление — скажу, есть ли риски.', msg: 'Бюджет, район, ссылка на объявление' },
    new:     { t: 'Подберу новостройку бесплатно', s: 'Моё вознаграждение платит застройщик. Пришлю 3–5 проектов под ваши условия.', msg: 'Бюджет, район, срок сдачи, ипотека' },
    comm:    { t: 'Рассчитаю доходность', s: 'Подберу помещение с арендатором и посчитаю доход с учётом налогов и простоя.', msg: 'Бюджет, желаемая доходность, формат' },
    country: { t: 'Проверю дом или участок', s: 'Земля, границы, коммуникации и документы — до задатка, а не после.', msg: 'Направление, бюджет, ссылка на объявление' },
    complex: { t: 'Опишите ситуацию', s: 'Скажу, кто и в каком порядке должен подписать и что для этого понадобится.', msg: 'Доли, наследство, дети, ипотека, другой город…', msgRequired: true },
    general: { t: 'Оставьте заявку', s: 'Перезвоню или напишу в удобный мессенджер в течение дня.', msg: 'Коротко о задаче' }
  };

  function goal(name, params) {
    try { if (window.ym) window.ym(COUNTER, 'reachGoal', name, params || {}); } catch (e) {}
  }

  var ICON = {
    tg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.04 15.42 8.7 20.2c.5 0 .72-.22.98-.48l2.35-2.25 4.87 3.57c.9.5 1.53.24 1.77-.83l3.2-15c.29-1.33-.48-1.85-1.35-1.53L1.6 9.5c-1.3.5-1.28 1.23-.22 1.56l4.9 1.53L17.6 5.9c.53-.35 1.02-.16.62.2L9.04 15.42Z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.55 15.2L2 22.4l5.35-1.4A10 10 0 1 0 12 2Zm0 1.9a8.1 8.1 0 1 1-4.2 15.02l-.3-.18-3.1.81.83-3.02-.2-.31A8.1 8.1 0 0 1 12 3.9Zm4.55 10.55c-.23-.12-1.36-.67-1.57-.75-.21-.08-.36-.11-.51.12-.15.23-.59.74-.72.9-.13.15-.27.17-.5.06-.23-.12-.97-.36-1.85-1.14-.68-.6-1.14-1.36-1.28-1.59-.13-.23-.01-.35.1-.47.11-.1.23-.27.35-.4.11-.14.15-.24.23-.39.08-.16.04-.29-.02-.4-.06-.12-.51-1.24-.7-1.69-.19-.44-.37-.38-.51-.39h-.44c-.15 0-.39.06-.6.29-.2.23-.79.77-.79 1.88s.81 2.18.92 2.33c.12.16 1.6 2.44 3.87 3.42.54.23.96.37 1.29.48.54.17 1.03.15 1.42.09.44-.07 1.36-.55 1.55-1.09.19-.54.19-1 .13-1.1-.06-.1-.21-.16-.44-.28Z"/></svg>',
    max: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12.6 2.4a9.5 9.5 0 1 1-5.3 17.4c-.85.55-1.85.92-2.94 1.05-.6.07-.99-.58-.7-1.12.42-.79.68-1.66.75-2.58A9.5 9.5 0 0 1 12.6 2.4Zm0 3.3a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Z"/><path d="M12.9 8.1a4.15 4.15 0 1 1-3.2 6.8c-.33.23-.72.4-1.15.48-.29.05-.48-.28-.34-.54.2-.37.32-.79.36-1.23A4.15 4.15 0 0 1 12.9 8.1Z"/></svg>',
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3c0 1-.8 1.8-1.8 1.7C10.6 18.5 5.5 13.4 4.8 5.3 4.7 4.3 5.5 3.5 6.5 3.5Z"/></svg>'
  };

  var CSS =
    '.ld{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:16px;background:rgba(10,16,28,.55);' +
    'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;transition:opacity .2s}' +
    '.ld.on{opacity:1}' +
    '.ld-box{position:relative;width:100%;max-width:520px;max-height:calc(100dvh - 32px);overflow:auto;background:var(--surface,#fff);' +
    'color:var(--ink,#101A2C);border-radius:28px;padding:30px 28px 24px;box-shadow:0 30px 80px rgba(10,16,28,.35);' +
    'font:15px/1.55 Onest,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transform:translateY(12px);transition:transform .25s}' +
    '.ld.on .ld-box{transform:none}' +
    '.ld-x{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;border:0;background:var(--surface-2,#F7F8FA);' +
    'color:var(--ink,#101A2C);font-size:22px;line-height:1;cursor:pointer}' +
    '.ld-eb{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent-ink,#2A4370);margin:0 0 8px}' +
    '.ld h2{font-size:clamp(24px,5.4vw,30px);line-height:1.12;letter-spacing:-.03em;margin:0 44px 8px 0;font-weight:600}' +
    '.ld-sub{margin:0 0 20px;color:var(--ink-2,#525C6B)}' +
    '.ld form{display:grid;gap:12px;background:none;border-radius:0;padding:0;margin:0}' +
    '.ld label{display:block;font-size:13px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--ink-2,#525C6B);margin:0}' +
    '.ld-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '.ld label.f{display:grid;gap:5px;font-size:13px;color:var(--ink-2,#525C6B);min-width:0}' +
    '.ld input[type=text],.ld input[type=tel],.ld textarea{font:inherit;font-size:16px;color:var(--ink,#101A2C);background:var(--surface-2,#F7F8FA);' +
    'border:1px solid rgba(16,26,44,.14);border-radius:14px;padding:12px 14px;width:100%;min-width:0}' +
    '.ld textarea{min-height:76px;resize:vertical}' +
    '.ld input:focus,.ld textarea:focus{outline:2px solid var(--accent,#2F4A7A);outline-offset:1px;border-color:transparent}' +
    '.ld-ch{display:flex;flex-wrap:wrap;gap:8px;border:0;padding:0;margin:0}' +
    '.ld-ch legend{font-size:13px;color:var(--ink-2,#525C6B);margin-bottom:6px;padding:0}' +
    '.ld-ch label{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(16,26,44,.16);border-radius:999px;padding:7px 13px;font-size:14px;cursor:pointer}' +
    '.ld-ch input{accent-color:var(--accent,#2F4A7A);margin:0}' +
    '.ld-ch label:has(input:checked){border-color:var(--accent,#2F4A7A);background:var(--accent-soft,#E5EAF3)}' +
    '.ld label.ld-ok{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--ink-2,#525C6B)}' +
    '.ld-ok input{margin-top:2px;width:18px;height:18px;flex:none;accent-color:var(--accent,#2F4A7A)}' +
    '.ld-ok a{color:inherit;text-decoration:underline;text-underline-offset:2px}' +
    '.ld-send{font:inherit;font-weight:600;font-size:16px;border:0;border-radius:999px;padding:15px 22px;background:var(--accent,#2F4A7A);' +
    'color:var(--on-accent,#fff);cursor:pointer;width:100%}' +
    '.ld-send[disabled]{opacity:.5;cursor:not-allowed}' +
    '.ld-err{font-size:13.5px;color:#A33A2B;margin:0}' +
    '.ld-alt{margin-top:18px;padding-top:16px;border-top:1px solid rgba(16,26,44,.10);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}' +
    '.ld-alt span{font-size:13px;color:var(--ink-3,#687180)}' +
    '.ld-alt nav{display:flex;gap:8px}' +
    '.ld-alt a{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(16,26,44,.14);color:var(--ink-2,#525C6B)}' +
    '.ld-alt a:hover{color:var(--ink,#101A2C);border-color:rgba(16,26,44,.3)}' +
    '.ld-alt svg{width:19px;height:19px}' +
    '.ld-done{text-align:left}' +
    '.ld-done .ic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft,#E5EAF3);color:var(--accent,#2F4A7A);margin-bottom:14px}' +
    '.ld-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '@media(max-width:520px){.ld{padding:0;align-items:end}.ld-box{border-radius:24px 24px 0 0;max-height:94dvh;padding:26px 18px calc(20px + env(safe-area-inset-bottom))}' +
    '.ld-2:not(.ld-2s){grid-template-columns:1fr}}' +
    '@media (prefers-reduced-motion:reduce){.ld,.ld-box{transition:none}}';

  var root = null, lastFocus = null, openedAt = 0, topic = 'general';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'ld';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'ld-title');
    document.body.appendChild(root);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    document.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(root.querySelectorAll('a[href],button:not([disabled]),input:not(.ld-hp input),textarea')).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function formHTML(cfg) {
    var est = cfg.est ?
      '<label class="f" for="ld-addr">Адрес или ЖК<input id="ld-addr" name="address" type="text" autocomplete="street-address" maxlength="200" placeholder="Москва, ул. …, д. …"></label>' +
      '<div class="ld-2 ld-2s"><label class="f" for="ld-rooms">Комнат<input id="ld-rooms" name="rooms" type="text" inputmode="numeric" maxlength="10" placeholder="2"></label>' +
      '<label class="f" for="ld-area">Площадь, м²<input id="ld-area" name="area" type="text" inputmode="decimal" maxlength="10" placeholder="54"></label></div>' : '';
    return '' +
      '<button class="ld-x" type="button" aria-label="Закрыть">×</button>' +
      '<p class="ld-eb">Дмитрий Минаев · брокер</p>' +
      '<h2 id="ld-title">' + esc(cfg.t) + '</h2>' +
      '<p class="ld-sub">' + esc(cfg.s) + '</p>' +
      '<form novalidate>' + est +
        '<div class="ld-2"><label class="f" for="ld-name">Имя<input id="ld-name" name="name" type="text" autocomplete="given-name" maxlength="80" required></label>' +
        '<label class="f" for="ld-phone">Телефон<input id="ld-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="+7" required></label></div>' +
        '<label class="f" for="ld-msg">' + (cfg.msgRequired ? 'Ситуация' : 'Комментарий, если нужно') + '<textarea id="ld-msg" name="message" maxlength="1500" placeholder="' + esc(cfg.msg) + '"' + (cfg.msgRequired ? ' required' : '') + '></textarea></label>' +
        '<fieldset class="ld-ch"><legend>Как ответить</legend>' +
          '<label><input type="radio" name="channel" value="Telegram" checked> Telegram</label>' +
          '<label><input type="radio" name="channel" value="WhatsApp"> WhatsApp</label>' +
          '<label><input type="radio" name="channel" value="MAX"> MAX</label>' +
          '<label><input type="radio" name="channel" value="Звонок"> Позвонить</label>' +
        '</fieldset>' +
        '<div class="ld-hp" aria-hidden="true"><label>Сайт<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<label class="ld-ok" for="ld-agree"><input id="ld-agree" name="consent" type="checkbox" value="1">' +
          '<span>Даю <a href="/soglasie/" target="_blank">согласие на обработку персональных данных</a> в соответствии с <a href="/privacy/" target="_blank">политикой</a></span></label>' +
        '<p class="ld-err" hidden></p>' +
        '<button class="ld-send" type="submit" disabled>Отправить</button>' +
      '</form>' +
      '<div class="ld-alt"><span>Или напишите напрямую</span><nav>' +
        '<a href="' + TG + '" target="_blank" rel="noopener" aria-label="Telegram">' + ICON.tg + '</a>' +
        '<a href="' + WA + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ICON.wa + '</a>' +
        '<a href="' + MAX + '" target="_blank" rel="noopener" aria-label="MAX">' + ICON.max + '</a>' +
        '<a href="tel:' + PHONE_TEL + '" aria-label="Позвонить ' + PHONE_TXT + '">' + ICON.tel + '</a>' +
      '</nav></div>';
  }

  function doneHTML(channel) {
    var how = channel === 'Звонок' ? 'перезвоню' : 'напишу в ' + channel;
    return '<button class="ld-x" type="button" aria-label="Закрыть">×</button>' +
      '<div class="ld-done"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5L19 7"/></svg></div>' +
      '<h2 id="ld-title">Заявка у меня</h2>' +
      '<p class="ld-sub">Посмотрю и ' + esc(how) + ' в течение дня. Если вопрос срочный — звоните: <a href="tel:' + PHONE_TEL + '">' + PHONE_TXT + '</a>.</p>' +
      '<button class="ld-send" type="button" data-ld-close>Хорошо</button></div>';
  }

  function utm() {
    try {
      var q = new URLSearchParams(location.search), out = [];
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term'].forEach(function (k) { if (q.get(k)) out.push(k.replace('utm_', '') + '=' + q.get(k)); });
      return out.join(', ');
    } catch (e) { return ''; }
  }

  function wire(cfg) {
    var box = root.querySelector('.ld-box');
    box.querySelector('.ld-x').addEventListener('click', close);
    var form = box.querySelector('form');
    var agree = form.querySelector('#ld-agree');
    var btn = form.querySelector('.ld-send');
    var err = form.querySelector('.ld-err');
    agree.addEventListener('change', function () { btn.disabled = !agree.checked; });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      var name = form.name.value.trim();
      var phone = form.phone.value.trim();
      var digits = phone.replace(/\D/g, '');
      if (!name) return fail('Как к вам обращаться?', form.name);
      if (digits.length < 10 || digits.length > 15) return fail('Проверьте номер телефона: нужно 10–11 цифр.', form.phone);
      if (cfg.msgRequired && !form.message.value.trim()) return fail('Опишите ситуацию в двух словах.', form.message);
      if (!agree.checked) return fail('Отметьте согласие на обработку данных.', agree);

      var fd = new FormData(form);
      fd.append('topic', topic);
      fd.append('page', location.pathname);
      fd.append('ref', document.referrer ? document.referrer.slice(0, 200) : '');
      fd.append('utm', utm());
      fd.append('t', String(Math.round((Date.now() - openedAt) / 1000)));
      var channel = (form.querySelector('input[name=channel]:checked') || {}).value || 'Telegram';

      btn.disabled = true;
      btn.textContent = 'Отправляю…';
      fetch('/send.php', { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (!res || !res.ok) throw new Error(res && res.error || 'send');
          goal('lead', { topic: topic });
          box.innerHTML = doneHTML(channel);
          box.querySelector('.ld-x').addEventListener('click', close);
          box.querySelector('[data-ld-close]').addEventListener('click', close);
          box.querySelector('[data-ld-close]').focus();
        })
        .catch(function (ex) {
          btn.disabled = false;
          btn.textContent = 'Отправить';
          fail(ex && ex.message && ex.message !== 'send' && ex.message.length < 140 ? ex.message :
            'Не получилось отправить. Напишите в Telegram или позвоните ' + PHONE_TXT + ' — отвечу сразу.');
        });
    });

    function fail(text, el) {
      err.textContent = text;
      err.hidden = false;
      if (el && el.focus) el.focus();
    }
  }

  function open(t, trigger) {
    if (!root) build();
    topic = TOPICS[t] ? t : 'general';
    var cfg = TOPICS[topic];
    lastFocus = trigger || document.activeElement;
    root.innerHTML = '<div class="ld-box">' + formHTML(cfg) + '</div>';
    wire(cfg);
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { root.classList.add('on'); });
    openedAt = Date.now();
    var first = root.querySelector('input:not([type=hidden]):not([tabindex="-1"])');
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    goal('lead_open', { topic: topic });
  }

  function close() {
    if (!root || root.hidden) return;
    root.classList.remove('on');
    document.documentElement.style.overflow = '';
    setTimeout(function () { root.hidden = true; root.innerHTML = ''; }, 180);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-lead]');
    if (!a) return;
    e.preventDefault();
    open(a.getAttribute('data-lead'), a);
  });

  /* ссылка вида /#zayavka-sell открывает форму сразу (для рекламы и рассылок) */
  var m = /^#zayavka-([a-z]+)$/.exec(location.hash);
  if (m) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { open(m[1]); });
    else open(m[1]);
  }

  window.RMLead = { open: open, close: close };
})();
