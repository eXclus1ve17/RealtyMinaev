/* ============================================================
   Заявка с сайта — модальное окно, общее для всех страниц.

   Открывается любым элементом с атрибутом data-lead="<тема>":
     sell     — продажа
     second   — покупка вторички
     new      — новостройка
     comm     — коммерция
     country  — загородная
     complex  — сложная ситуация
     general  — общий вопрос
   Без JS такая ссылка ведёт по своему href (Telegram) — заявка не теряется.

   Поля: имя, телефон, согласие на обработку ПД.
   Отправка: POST /send.php → Telegram-бот и почта (см. send.php).
   Цели Метрики: lead_open — открыли форму, lead — заявка ушла.
   ============================================================ */
(function () {
  'use strict';

  var COUNTER = 112500819;
  var PHONE_TEL = '+79263977775';
  var PHONE_TXT = '+7 (926) 397-77-75';

  var TOPICS = {
    sell:    { t: 'Обсудим продажу', s: 'Оставьте телефон — позвоню или напишу, оценю квартиру по реальным сделкам в вашем доме.' },
    second:  { t: 'Обсудим покупку', s: 'Оставьте телефон — позвоню или напишу и расскажу, как подберу и проверю квартиру.' },
    new:     { t: 'Обсудим новостройку', s: 'Оставьте телефон — позвоню или напишу. Подбор для вас бесплатный.' },
    comm:    { t: 'Обсудим инвестицию', s: 'Оставьте телефон — позвоню или напишу и посчитаю доходность под ваш бюджет.' },
    country: { t: 'Обсудим загородную', s: 'Оставьте телефон — позвоню или напишу и расскажу, что проверить в доме и участке.' },
    complex: { t: 'Опишу, что понадобится', s: 'Оставьте телефон — позвоню или напишу, разберём вашу ситуацию.' },
    general: { t: 'Оставьте заявку', s: 'Позвоню или напишу вам в течение дня.' }
  };


  function goal(name, params) {
    try { if (window.ym) window.ym(COUNTER, 'reachGoal', name, params || {}); } catch (e) {}
  }

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
    '.ld label.f{display:grid;gap:5px;font-size:13px;color:var(--ink-2,#525C6B);min-width:0}' +
    '.ld input[type=text],.ld input[type=tel],.ld textarea{font:inherit;font-size:16px;color:var(--ink,#101A2C);background:var(--surface-2,#F7F8FA);' +
    'border:1px solid rgba(16,26,44,.14);border-radius:14px;padding:12px 14px;width:100%;min-width:0}' +
    '.ld input:focus,.ld textarea:focus{outline:2px solid var(--accent,#2F4A7A);outline-offset:1px;border-color:transparent}' +
    '.ld label.ld-ok{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--ink-2,#525C6B)}' +
    '.ld-ok input{margin-top:2px;width:18px;height:18px;flex:none;accent-color:var(--accent,#2F4A7A)}' +
    '.ld-ok a{color:inherit;text-decoration:underline;text-underline-offset:2px}' +
    '.ld-send{font:inherit;font-weight:600;font-size:16px;border:0;border-radius:999px;padding:15px 22px;background:var(--accent,#2F4A7A);' +
    'color:var(--on-accent,#fff);cursor:pointer;width:100%}' +
    '.ld-send[disabled]{opacity:.5;cursor:not-allowed}' +
    '.ld-err{font-size:13.5px;color:#A33A2B;margin:0}' +
    '.ld-done{text-align:left}' +
    '.ld-done .ic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft,#E5EAF3);color:var(--accent,#2F4A7A);margin-bottom:14px}' +
    '.ld-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '@media(max-width:520px){.ld{padding:0;align-items:end}.ld-box{border-radius:24px 24px 0 0;max-height:94dvh;padding:26px 18px calc(20px + env(safe-area-inset-bottom))}}' +
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
    return '' +
      '<button class="ld-x" type="button" aria-label="Закрыть">×</button>' +
      '<p class="ld-eb">Дмитрий Минаев · брокер</p>' +
      '<h2 id="ld-title">' + esc(cfg.t) + '</h2>' +
      '<p class="ld-sub">' + esc(cfg.s) + '</p>' +
      '<form novalidate>' +
        '<label class="f" for="ld-name">Имя<input id="ld-name" name="name" type="text" autocomplete="given-name" maxlength="80" required></label>' +
        '<label class="f" for="ld-phone">Телефон<input id="ld-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="+7" required></label>' +
        '<div class="ld-hp" aria-hidden="true"><label>Сайт<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<label class="ld-ok" for="ld-agree"><input id="ld-agree" name="consent" type="checkbox" value="1">' +
          '<span>Даю <a href="/soglasie/" target="_blank">согласие на обработку персональных данных</a> в соответствии с <a href="/privacy/" target="_blank">политикой</a></span></label>' +
        '<p class="ld-err" hidden></p>' +
        '<button class="ld-send" type="submit" disabled>Отправить</button>' +
      '</form>';
  }

  function doneHTML() {
    return '<button class="ld-x" type="button" aria-label="Закрыть">×</button>' +
      '<div class="ld-done"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5L19 7"/></svg></div>' +
      '<h2 id="ld-title">Заявка у меня</h2>' +
      '<p class="ld-sub">Позвоню или напишу вам в течение дня. Если вопрос срочный — звоните: <a href="tel:' + PHONE_TEL + '">' + PHONE_TXT + '</a>.</p>' +
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
      if (!agree.checked) return fail('Отметьте согласие на обработку данных.', agree);

      var fd = new FormData(form);
      fd.append('topic', topic);
      fd.append('page', location.pathname);
      fd.append('ref', document.referrer ? document.referrer.slice(0, 200) : '');
      fd.append('utm', utm());
      fd.append('t', String(Math.round((Date.now() - openedAt) / 1000)));

      btn.disabled = true;
      btn.textContent = 'Отправляю…';
      fetch('/send.php', { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (!res || !res.ok) throw new Error(res && res.error || 'send');
          goal('lead', { topic: topic });
          box.innerHTML = doneHTML();
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
