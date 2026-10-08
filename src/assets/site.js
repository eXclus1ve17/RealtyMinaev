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
