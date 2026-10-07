/* ============================================================
   Cookie-согласие, Яндекс.Метрика и цели — общий файл для всех страниц.

   Метрика (счётчик 112500819) запускается только после того, как
   посетитель нажал «Принять». Выбор хранится в localStorage
   (rm_consent = "yes" | "no"), повторно баннер не показывается.
   Ссылка с атрибутом data-cookie-settings открывает баннер снова.

   Цели Метрики (тип «JavaScript-событие», идентификаторы ниже):
     call            — клик по телефону
     write_telegram  — клик по ссылке на Telegram
     write_whatsapp  — клик по ссылке на WhatsApp
     write_max       — клик по ссылке на MAX
     contact         — любой из четырёх кликов выше (общая цель)
     <data-goal>     — своя цель у элемента с атрибутом data-goal
   В параметры визита уходит блок, где был клик (place).
   ============================================================ */
(function () {
  'use strict';

  var COUNTER = 112500819;
  var KEY = 'rm_consent';
  var POLICY_URL = '/privacy/';

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  /* ---------- Метрика ---------- */
  var metrikaStarted = false;
  function startMetrika() {
    if (metrikaStarted) return;
    metrikaStarted = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
      k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(COUNTER, 'init', {
      ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer',
      accurateTrackBounce: true, trackLinks: true
    });
  }

  /* ---------- Цели ---------- */
  function goalsFor(a) {
    var list = [];
    var own = a.getAttribute('data-goal');
    if (own) list.push(own);
    var href = (a.getAttribute('href') || '').toLowerCase();
    var contact = null;
    if (href.indexOf('tel:') === 0) contact = 'call';
    else if (href.indexOf('t.me/') > -1) contact = 'write_telegram';
    else if (href.indexOf('wa.me/') > -1) contact = 'write_whatsapp';
    else if (href.indexOf('max.ru/') > -1) contact = 'write_max';
    if (contact) {
      if (list.indexOf(contact) < 0) list.push(contact);
      list.push('contact');
    }
    return list;
  }
  function placeOf(el) {
    var s = el.closest('section[id], header, footer, nav, [data-place]');
    if (!s) return 'page';
    return s.getAttribute('data-place') || s.id || s.className.split(' ')[0] || s.tagName.toLowerCase();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href], [data-goal]');
    if (!a || !window.ym) return;
    if (a.hasAttribute('data-lead') && !a.getAttribute('data-goal')) return; // форма заявки считает свои цели сама
    var goals = goalsFor(a);
    if (!goals.length) return;
    var params = { place: placeOf(a) };
    for (var i = 0; i < goals.length; i++) window.ym(COUNTER, 'reachGoal', goals[i], params);
  });

  /* ---------- Баннер ---------- */
  var CSS =
    '.ck{position:fixed;z-index:9999;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;' +
    'background:var(--surface,#fff);color:var(--ink,#101A2C);border:1px solid rgba(16,26,44,.12);' +
    'border-radius:20px;box-shadow:0 18px 50px rgba(16,26,44,.18);padding:18px 20px;' +
    'font:14px/1.55 Onest,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
    '.ck p{margin:0 0 14px;color:var(--ink-2,#525C6B)}' +
    '.ck a{color:inherit;text-decoration:underline;text-underline-offset:2px}' +
    '.ck-row{display:flex;gap:10px;flex-wrap:wrap}' +
    '.ck button{font:inherit;font-weight:600;cursor:pointer;border-radius:999px;padding:11px 20px;' +
    'border:1px solid rgba(16,26,44,.18);background:transparent;color:var(--ink,#101A2C)}' +
    '.ck button.ck-yes{background:var(--ink,#101A2C);border-color:var(--ink,#101A2C);color:#fff}' +
    '.ck button:focus-visible{outline:2px solid var(--accent,#2E4A7D);outline-offset:2px}' +
    '@media(max-width:820px){.ck{bottom:84px;left:12px;right:12px;padding:14px 16px;font-size:13px;border-radius:18px}.ck p{margin-bottom:10px}.ck button{padding:9px 16px}}';

  var box = null;
  function showBanner() {
    if (box) { box.hidden = false; return; }
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    box = document.createElement('div');
    box.className = 'ck';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    box.setAttribute('aria-label', 'Согласие на cookie');
    box.innerHTML =
      '<p>Сайт использует cookie и сервис Яндекс.Метрика, чтобы понимать, какие разделы полезны посетителям. ' +
      'Подробнее — в <a href="' + POLICY_URL + '">политике обработки персональных данных</a>.</p>' +
      '<div class="ck-row"><button type="button" class="ck-yes">Принять</button>' +
      '<button type="button" class="ck-no">Отказаться</button></div>';
    document.body.appendChild(box);
    box.querySelector('.ck-yes').addEventListener('click', function () {
      setChoice('yes'); box.hidden = true; startMetrika();
    });
    box.querySelector('.ck-no').addEventListener('click', function () {
      setChoice('no'); box.hidden = true;
      // если до этого согласие было дано, а теперь отозвано — счётчик
      // перестанет загружаться со следующей страницы
    });
  }

  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-cookie-settings]');
    if (!s) return;
    e.preventDefault();
    showBanner();
  });

  function init() {
    var c = getChoice();
    if (c === 'yes') startMetrika();
    else if (c !== 'no') showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
