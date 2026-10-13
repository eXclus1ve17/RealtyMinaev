// Меню, баннер cookie, Метрика и её цели. Без библиотек.
(function () {
  // выпадающие списки в шапке: клик открывает, Esc и клик мимо закрывают
  var btns = document.querySelectorAll('.nav-a[aria-controls]');
  function closeAll(except) {
    btns.forEach(function (b) {
      if (b === except) return;
      b.setAttribute('aria-expanded', 'false');
      document.getElementById(b.getAttribute('aria-controls')).classList.remove('open');
    });
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = b.getAttribute('aria-expanded') !== 'true';
      closeAll(b);
      b.setAttribute('aria-expanded', String(open));
      document.getElementById(b.getAttribute('aria-controls')).classList.toggle('open', open);
    });
  });
  document.addEventListener('click', function () { closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); closeM(); } });

  // мобильное меню
  var m = document.getElementById('mnav');
  function closeM() { if (m) { m.classList.remove('open'); document.body.style.overflow = ''; } }
  document.querySelectorAll('[data-mnav]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.dataset.mnav === 'open';
      m.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) m.querySelector('.mnav-close').focus();
    });
  });

  // Метрика загружается только после согласия на cookie.
  var ID = window.YM_ID, KEY = 'cookie-ok';
  function loadMetrika() {
    (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) };
      m[i].l = 1 * new Date(); k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a) })
      (window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    ym(ID, 'init', { ssr: true, webvisor: true, clickmap: true, accurateTrackBounce: true, trackLinks: true });
  }
  var ok = null;
  try { ok = localStorage.getItem(KEY); } catch (e) {}
  var banner = document.getElementById('cookie');
  if (ok === '1') loadMetrika();
  else if (ok !== '0' && banner) banner.classList.add('show');
  document.querySelectorAll('[data-cookie]').forEach(function (b) {
    b.addEventListener('click', function () {
      var yes = b.dataset.cookie === 'yes';
      try { localStorage.setItem(KEY, yes ? '1' : '0'); } catch (e) {}
      banner.classList.remove('show');
      if (yes) loadMetrika();
    });
  });

  // цели: позвонить, Telegram, WhatsApp, MAX — по атрибуту data-goal
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goal]');
    if (g && window.ym) ym(ID, 'reachGoal', g.getAttribute('data-goal'));
  });
})();

// Заявка «Перезвоните мне»: отправка без перезагрузки, цель Метрики lead_form.
(function () {
  document.querySelectorAll('form[data-lead]').forEach(function (f) {
    var h1 = document.querySelector('h1');
    f.page.value = location.pathname;
    f.topic.value = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : document.title;
    f.addEventListener('submit', function (e) {
      if (!window.fetch) return;            // старый браузер — обычная отправка формы
      e.preventDefault();
      var msg = f.querySelector('.lead-msg'), btn = f.querySelector('button');
      var digits = (f.phone.value.match(/\d/g) || []).length;
      if (digits < 10) { msg.className = 'lead-msg err'; msg.textContent = 'Проверьте номер: нужно 10–11 цифр.'; f.phone.focus(); return; }
      btn.disabled = true; msg.className = 'lead-msg'; msg.textContent = 'Отправляю…';
      fetch(f.action, { method: 'POST', body: new FormData(f), headers: { 'X-Requested-With': 'fetch' } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) throw new Error(d.error || 'fail');
          msg.className = 'lead-msg ok'; msg.textContent = 'Спасибо! Перезвоню в ближайшее время.';
          var t = f.topic.value; f.reset(); f.page.value = location.pathname; f.topic.value = t;
          if (window.ym) ym(window.YM_ID, 'reachGoal', 'lead_form');
        })
        .catch(function () {
          msg.className = 'lead-msg err';
          msg.innerHTML = 'Не получилось отправить. Позвоните: <a href="tel:+79263977775">+7 (926) 397-77-75</a>';
        })
        .finally(function () { btn.disabled = !f.consent.checked; });
    });
  });
})();

// Кнопка «Жду звонка» активна только после галочки согласия.
// Делается скриптом: без JavaScript кнопка не блокируется, а галочку проверит браузер (required).
(function () {
  document.querySelectorAll('form[data-lead]').forEach(function (f) {
    var box = f.querySelector('input[name=consent]'), btn = f.querySelector('button[type=submit]');
    if (!box || !btn) return;
    var sync = function () { btn.disabled = !box.checked; btn.title = box.checked ? '' : 'Отметьте согласие на обработку данных'; };
    box.addEventListener('change', sync);
    f.addEventListener('reset', function () { setTimeout(sync, 0); });
    sync();
  });
})();

// Политика и согласие открываются окном поверх страницы.
// По прямой ссылке (и без JavaScript) это обычные страницы.
(function () {
  var DOCS = /^\/(politika-konfidencialnosti|soglasie)\/$/, dlg;
  var CSS = '.docdlg{width:min(720px,calc(100vw - 24px));max-height:min(86vh,900px);padding:0;border:0;border-radius:22px;background:#fff;color:#101A2C;box-shadow:0 30px 80px -20px rgba(16,26,44,.45);overflow:hidden}'
    + '.docdlg::backdrop{background:rgba(16,26,44,.55);backdrop-filter:blur(3px)}'
    + '.docdlg-b{max-height:min(86vh,900px);overflow:auto;padding:28px clamp(18px,4vw,40px) 30px;font-size:14.5px;line-height:1.6;color:#525C6B}'
    + '.docdlg-x{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;border:0;background:#F4F5F7;font-size:24px;line-height:1;color:#101A2C;cursor:pointer}'
    + '.docdlg h1{font-size:22px;line-height:1.25;letter-spacing:-.02em;color:#101A2C;margin:6px 48px 12px 0}'
    + '.docdlg h2{font-size:15px;font-weight:600;color:#101A2C;margin:20px 0 6px}'
    + '.docdlg p+p{margin-top:8px}.docdlg a{color:#2A4370;text-decoration:underline}'
    + '.docdlg .doc-k{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#6E7785}'
    + '.docdlg .doc-f{margin-top:20px;padding-top:12px;border-top:1px solid rgba(16,26,44,.08);font-size:13px}'
    + '.docdlg table{width:100%;border-collapse:collapse;margin:8px 0;font-size:13.5px}'
    + '.docdlg th,.docdlg td{text-align:left;vertical-align:top;padding:8px 8px;border-bottom:1px solid rgba(16,26,44,.08)}.docdlg th{color:#101A2C;font-weight:600}'
    + '@media (max-width:640px){.docdlg table,.docdlg tbody,.docdlg tr,.docdlg th,.docdlg td{display:block}.docdlg tr{padding:6px 0;border-bottom:1px solid rgba(16,26,44,.08)}.docdlg th,.docdlg td{border:0;padding:2px 0}}';

  function box() {
    if (dlg) return dlg;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    dlg = document.createElement('dialog'); dlg.className = 'docdlg';
    dlg.innerHTML = '<button class="docdlg-x" type="button" aria-label="Закрыть">×</button><div class="docdlg-b"></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('.docdlg-x').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    return dlg;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || !window.HTMLDialogElement) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || !DOCS.test(u.pathname) || u.pathname === location.pathname) return;
    e.preventDefault();
    var d = box(), body = d.querySelector('.docdlg-b');
    body.innerHTML = '<p>Загружаю…</p>';
    if (!d.open) d.showModal();
    fetch(u.pathname).then(function (r) { return r.text(); }).then(function (h) {
      var doc = new DOMParser().parseFromString(h, 'text/html').getElementById('doc');
      if (!doc) { location.href = u.pathname; return; }
      body.innerHTML = doc.innerHTML; body.scrollTop = 0;
    }).catch(function () { location.href = u.pathname; });
  });
})();
