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

// Движение: появление «лесенкой», заголовки построчно, счётчики цифр,
// подсветка карточек и магнитные кнопки. При «уменьшить движение» — ничего.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // 1. Появление лесенкой: элементы одной группы выезжают по очереди
  var GROUPS = '.pairs > .pair, .algo-steps > .algo-step, .cards > .card, .cards > .post, .cases-grid > .case, .cx-list > .cx, .tiles > .tile, .stats > .stat, .faq > details, .check > a, .checks > li, .algo-out li, .att-rows > li, .ch-list > .ch';
  var items = [].slice.call(document.querySelectorAll(GROUPS));
  var seen = new Map();
  items.forEach(function (el) {
    var p = el.parentNode, n = seen.get(p) || 0;
    seen.set(p, n + 1);
    el.style.setProperty('--i', Math.min(n, 8));
    var rv = el.closest('.rv'); if (rv) rv.classList.add('rv-off');
    el.classList.add('m-st');
  });
  // проявляем всё, до чего человек уже долистал, — и при быстрой прокрутке тоже
  var left = items.slice(), ticking = false;
  var reveal = function () {
    ticking = false;
    var lim = innerHeight * 0.92;
    left = left.filter(function (el) {
      if (el.getBoundingClientRect().top < lim) { el.classList.add('m-in'); return false; }
      return true;
    });
    if (!left.length) removeEventListener('scroll', onScroll);
  };
  var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(reveal); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  requestAnimationFrame(function () { requestAnimationFrame(reveal); });

  // 2. Заголовок страницы построчно (на главной строки уже размечены)
  var h1 = document.querySelector('.ph .h1, .doc h1');
  var split = function () {
    if (!h1 || h1.classList.contains('m-ready')) return;
    var walk = function (node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = document.createDocumentFragment();
          c.textContent.split(/( +)/).forEach(function (t) {
            if (!t) return;
            if (/^ +$/.test(t)) { f.appendChild(document.createTextNode(t)); return; }
            var s = document.createElement('span'); s.className = 'm-w'; s.textContent = t; f.appendChild(s);
          });
          c.parentNode.replaceChild(f, c);
        } else if (c.nodeType === 1) walk(c);
      });
    };
    walk(h1);
    var top = null, line = -1;
    [].slice.call(h1.querySelectorAll('.m-w')).forEach(function (w) {
      var t = Math.round(w.offsetTop);
      if (top === null || Math.abs(t - top) > 4) { top = t; line++; }
      w.style.setProperty('--l', line);
    });
    h1.classList.add('m-ready');
  };
  if (h1 && !h1.querySelector('.ln')) {
    // строки считаем после загрузки шрифта, но не ждём дольше 0,5 с
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function (r) { setTimeout(r, 500); })]).then(split);
  }

  // 3. Счётчики: «100+», «>50%», «с 2020» отсчитываются при появлении
  var nums = [].slice.call(document.querySelectorAll('.stat b'));
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, txt = el.textContent, m = txt.match(/\d+/);
      if (!m) return;
      var end = +m[0], start = end > 1900 ? end - 20 : 0, t0 = null, dur = 1100;
      var step = function (ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur), v = Math.round(start + (end - start) * (1 - Math.pow(1 - k, 3)));
        el.textContent = txt.replace(m[0], v);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .6 });
  nums.forEach(function (n) { cio.observe(n); });

  if (!fine) return;

  // 4. Подсветка карточек под курсором
  var GLOW = '.card, .pair, .tile, .case, .cx, .stat, .channel, .ch, .author-card, .trust';
  [].slice.call(document.querySelectorAll(GLOW)).forEach(function (el) {
    el.classList.add('m-glow');
    if (el.closest('.cases, .contact-main')) el.classList.add('m-dark');
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // 5. Магнитные кнопки связи
  [].slice.call(document.querySelectorAll('.hdr-tel, .hdr-write, .btn-tel, .hero-actions .btn, .trust-cta .btn')).forEach(function (b) {
    b.classList.add('m-mag');
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
      b.style.transform = 'translate(' + (x * 8).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px)';
    });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });
})();
