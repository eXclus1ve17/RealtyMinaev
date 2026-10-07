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
