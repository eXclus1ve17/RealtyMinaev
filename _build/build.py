#!/usr/bin/env python3
"""
Сборка внутренних страниц realtyminaev.ru.

Стили, подвал и мобильная панель берутся прямо из index.html, поэтому
внутренние страницы всегда выглядят как главная: поменяли цвет на главной —
запустили сборку — он поменялся везде.

Тексты страниц лежат в _build/pages.py.

Запуск из корня репозитория:
    python3 _build/build.py

На хостинг загружаются готовые папки (prodat-kvartiru/, kupit-kvartiru/ …)
и sitemap.xml. Саму папку _build/ загружать не нужно.
"""
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pages import PAGES, SITE, ICONS  # noqa: E402

INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')


def grab(pattern, text=INDEX, flags=re.S):
    m = re.search(pattern, text, flags)
    if not m:
        raise SystemExit(f'Не нашёл в index.html: {pattern[:60]}')
    return m.group(0)


# ---------- из главной ----------
FONTS_CSS = grab(r'<style>\s*@font-face.*?</style>')
MAIN_CSS = grab(r'<style>\s*/\* =+\s*\n\s*Дмитрий Минаев.*?</style>')
FOOTER = grab(r'<footer class="ftr">.*?</footer>')
STICKY = grab(r'<nav class="sticky-bar".*?</nav>')
THEME = re.search(r'<html lang="ru" data-theme="(\w+)"', INDEX).group(1)
GOOGLE = grab(r'<meta name="google-site-verification"[^>]*>')
HERO_BLOCK = grab(r'<div class="hero-outer" id="top">.*?</section>\s*</div>')
TOPBAR_BLOCK = grab(r'<header class="topbar" id="topbar">.*?(?=<!-- =+ ГЕРОЙ)')
MAIN_JS = grab(r'<script>\s*\(function\(\)\{\s*\'use strict\';\s*var PHONE.*?</script>')




# ---------- стили внутренних страниц ----------
INNER_CSS = """
<style>
/* ===== Внутренние страницы: дополнение к стилям главной ===== */
/* H1 страницы — в первом экране, под именем, тем же приёмом, что и абзац на главной */
.hero-copy .ph-h1{color:#fff;font-size:7.2cqw;line-height:1.14;font-weight:600;letter-spacing:-.025em;margin:4.2cqw 0 2.6cqw;text-wrap:balance}
.hero-copy div.h1{color:#fff;margin:0 0 3.68cqw}
@media (min-width:561px) and (max-width:820px){.hero-copy div.h1{margin:0 0 3.2cqw}}
@media (max-width:560px){.hero-copy div.h1{margin:3.4cqw 0 1cqw}}
.pill[aria-current="page"]{background:#fff;color:var(--ink);border-color:#fff}
@media (max-width:560px){.hero-copy .ph-h1{font-size:22px;margin:14px 0 8px}}

/* разделы */
.sec{padding:clamp(40px,5.5vw,88px) 0 0}
.sec:last-of-type{padding-bottom:0}
.sec .head{margin-bottom:clamp(22px,3vw,40px)}
.sec .head .h2{max-width:24ch}
.info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,1.4vw,20px)}
.info-card{background:var(--surface);border-radius:var(--r-lg);padding:clamp(22px,2.6vw,36px);display:flex;flex-direction:column;gap:12px}
.info-card h3{font-size:clamp(18px,1.6vw,22px);font-weight:600;letter-spacing:-.025em;line-height:1.25;margin:0}
.info-card p{margin:0;color:var(--ink-2);font-size:15.5px;line-height:1.65}
.info-card ul{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.info-card li{position:relative;padding-left:20px;color:var(--ink-2);font-size:15px;line-height:1.55}
.info-card li::before{content:"";position:absolute;left:2px;top:.62em;width:7px;height:7px;border-radius:50%;background:var(--accent)}
.info-card li b{color:var(--ink);font-weight:600}

/* стоимость */
.price{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center}
.price .h2{font-size:clamp(24px,2.8vw,36px);margin:14px 0 12px}

/* частые вопросы */
.faq{background:var(--surface);border-radius:var(--r-xl);padding:clamp(8px,1.4vw,20px) clamp(20px,3vw,48px)}
.faq details{border-bottom:1px solid var(--line-2)}
.faq details:last-child{border-bottom:0}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:20px;
  padding:20px 0;font-size:clamp(16px,1.4vw,18px);font-weight:600;letter-spacing:-.02em}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";flex:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;
  font-size:20px;font-weight:400;color:var(--ink-2);transition:transform .2s}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq .ans{padding:0 0 20px;color:var(--ink-2);max-width:70ch;font-size:15.5px;line-height:1.65}
.faq .ans p{margin:0 0 10px}
.faq .ans a{color:var(--accent-ink);text-decoration:underline;text-underline-offset:3px}

/* сложные случаи: ссылки на разделы страницы «Сложные сделки» */
a.case{color:#fff;text-decoration:none;display:flex;flex-direction:column;gap:10px}
a.case .more{margin-top:auto;font-size:13px;font-weight:600;color:var(--metal-lite)}

/* страница «Сложные сделки»: разделы-случаи */
.jump{display:flex;flex-wrap:wrap;gap:8px}
.jump a{font-size:14px;font-weight:500;padding:9px 16px;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--ink)}
.jump a:hover{border-color:var(--ink)}
.cx{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(20px,3vw,48px);background:var(--surface);
  border-radius:var(--r-xl);padding:clamp(24px,3.4vw,56px);scroll-margin-top:96px}
.cx + .cx{margin-top:clamp(12px,1.4vw,20px)}
.cx .ic{width:44px;height:44px;border-radius:13px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin-bottom:18px}
.cx .ic svg{width:21px;height:21px}
.cx h2{font-size:clamp(24px,2.6vw,34px);line-height:1.12;letter-spacing:-.03em;font-weight:600;margin:0 0 14px}
.cx .lead{font-size:16px}
.cx-cols{display:grid;gap:18px}
.cx-cols h3{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent-ink);margin:0 0 10px}
.cx-cols ul{margin:0;padding:0;list-style:none;display:grid;gap:9px}
.cx-cols li{position:relative;padding-left:20px;color:var(--ink-2);font-size:15px;line-height:1.55}
.cx-cols li::before{content:"";position:absolute;left:2px;top:.62em;width:7px;height:7px;border-radius:50%;background:var(--accent)}
.cx-cols .do li::before{background:var(--metal)}
.cx .btn{align-self:flex-start;margin-top:22px}

/* призыв в конце */
.cta{background:var(--dark);color:#fff;border-radius:var(--r-xl);padding:clamp(28px,4vw,64px);display:grid;
  grid-template-columns:minmax(0,1fr) auto;gap:clamp(20px,3vw,48px);align-items:center}
.cta .eyebrow{color:var(--metal-lite)}
.cta .eyebrow::before{background:var(--metal-lite)}
.cta .h2{margin:14px 0 12px;font-size:clamp(26px,3.2vw,42px);max-width:20ch}
.cta p{margin:0;color:rgba(255,255,255,.72);max-width:52ch}
.cta .btn-row{justify-content:flex-end}

/* другие услуги */
.more-links{display:flex;flex-wrap:wrap;gap:10px}
.more-links a{display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;background:var(--surface);
  border:1px solid var(--line);font-weight:500;font-size:15px;color:var(--ink)}
.more-links a:hover{border-color:var(--ink)}
.more-links a::after{content:"→";color:var(--ink-3)}

/* карточка проекта на загородной */
.proj{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);background:var(--surface);border-radius:var(--r-xl);overflow:hidden;color:var(--ink)}
.proj img{width:100%;height:100%;object-fit:cover;min-height:240px;display:block}
.proj div{padding:clamp(24px,3vw,44px);display:flex;flex-direction:column;gap:12px;justify-content:center}
.proj b{font-size:clamp(30px,3.6vw,48px);letter-spacing:-.04em;line-height:1}
.proj b em{font-style:normal;color:var(--metal)}
.proj p{margin:0;color:var(--ink-2)}

.page-end{height:clamp(48px,6vw,96px)}

@media (max-width:1024px){
  .info{grid-template-columns:1fr}
  .cx{grid-template-columns:1fr}
}
@media (max-width:820px){
  .price,.cta{grid-template-columns:1fr}
  .cta .btn-row{justify-content:flex-start}
  .proj{grid-template-columns:1fr}
  .sc-grid{grid-template-columns:1fr}
}
</style>
"""

TEL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3c0 1-.8 1.8-1.8 1.7C10.6 18.5 5.5 13.4 4.8 5.3 4.7 4.3 5.5 3.5 6.5 3.5Z"/></svg>'
TICK = '<span class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5L19 7"/></svg></span>'

E = html.escape


PILL_PAGES = {'sell': '/prodat-kvartiru/', 'second': '/kupit-kvartiru/', 'new': '/novostrojki/',
              'country': '/zagorodnaya-nedvizhimost/', 'comm': '/kommercheskaya-nedvizhimost/'}


def fix_links(block):
    """Ссылки с главной → абсолютные: якоря ведут на главную, «Сложные сделки» — на свою страницу."""
    block = block.replace('href="#cases"', 'href="/slozhnye-sdelki/"')
    block = re.sub(r'href="#', 'href="/#', block)
    block = re.sub(r'(src|srcset)="img/', r'\1="/img/', block)
    block = re.sub(r'(,\s*)img/', r'\1/img/', block)
    return block


def topbar(current):
    return fix_links(TOPBAR_BLOCK)


def hero(p):
    h = fix_links(HERO_BLOCK)
    # имя остаётся тем же визуальным блоком, но H1 на странице — заголовок услуги
    h = h.replace('<h1 class="h1">', '<div class="h1">', 1).replace('</h1>', '</div>', 1)
    h = re.sub(r'<p class="lead">.*?</p>',
               f'<h1 class="ph-h1">{E(p["h1"])}</h1>\n        <p class="lead">{E(p["lead"])}</p>', h, count=1, flags=re.S)
    # овалы: вместо открытия сценария — переход на страницу услуги
    def pill(m):
        key = m.group(1)
        url = PILL_PAGES[key]
        cur = ' aria-current="page"' if url == p['url'] else ''
        return f'<a class="pill" href="{url}"{cur}>'
    h = re.sub(r'<a class="pill" href="/#scenarios" data-go="(\w+)">', pill, h)
    return h


def work(p):
    w = p.get('work')
    if not w:
        return ''
    pairs = ''.join(f'<div class="sc-pair"><div class="q">{E(q)}</div><div class="a">{E(a)}</div></div>' for q, a in w['pairs'])
    steps = ''.join(f'<div class="algo-step"><div><b>{E(t)}</b><p>{E(d)}</p></div></div>' for t, d in w['steps'])
    outs = ''.join(f'<li>{TICK}<span>{E(o)}</span></li>' for o in w['outs'])
    free = f'<p class="sc-free"><span class="ic">{ICONS["tag"]}</span><span>{w["free"]}</span></p>' if w.get('free') else ''
    cta_label, cta_topic = p['cta']
    return f'''<section class="sec" id="kak-rabotayu">
  <div class="wrap">
    <div class="panel">
      <div class="sc-grid">
        <div class="sc-intro">
          <div class="eyebrow">С чем приходят</div>
          <h2 class="h2">{E(w['title'])}</h2>
          <p class="lead">{E(w['lead'])}</p>
          {free}
          <div class="sc-pairs">{pairs}</div>
        </div>
        <div class="algo">
          <div class="algo-h"><span class="t">Что я делаю</span><span class="term"><i>{E(w['term'][0])}</i>{E(w['term'][1])}</span></div>
          {steps}
          <div class="algo-out"><div class="t">Что получаете вы</div><ul>{outs}</ul></div>
          <div class="algo-cta"><a class="btn btn-accent" href="https://t.me/RealtyMinaev" data-lead="{cta_topic}">{E(cta_label)}</a></div>
        </div>
      </div>
    </div>
  </div>
</section>'''


def info(p):
    blocks = p.get('info')
    if not blocks:
        return ''
    cards = []
    for b in blocks:
        body = ''.join(f'<p>{x}</p>' for x in b.get('p', []))
        if b.get('ul'):
            body += '<ul>' + ''.join(f'<li>{x}</li>' for x in b['ul']) + '</ul>'
        cards.append(f'<article class="info-card"><h3>{E(b["h"])}</h3>{body}</article>')
    return f'''<section class="sec">
  <div class="wrap">
    <div class="head"><div class="eyebrow">{E(p.get('info_eyebrow', 'Подробно'))}</div><h2 class="h2">{E(p['info_title'])}</h2></div>
    <div class="info">{''.join(cards)}</div>
  </div>
</section>'''


def complex_links(p):
    items = p.get('complex')
    if not items:
        return ''
    cards = ''.join(
        f'<a class="case" href="/slozhnye-sdelki/#{a}"><span class="ic">{ICONS[ic]}</span><h3>{E(t)}</h3><p>{E(d)}</p><span class="more">Подробнее →</span></a>'
        for a, ic, t, d in items)
    return f'''<section class="sec">
  <div class="wrap">
    <div class="cases">
      <div class="cases-head"><div class="eyebrow">Сложные случаи</div><h2 class="h2">{E(p.get('complex_title', 'Если в квартире есть сложности'))}</h2></div>
      <div class="cases-grid">{cards}</div>
    </div>
  </div>
</section>'''


def cases_page(p):
    items = p.get('cases')
    if not items:
        return ''
    jump = ''.join(f'<a href="#{c["id"]}">{E(c["short"])}</a>' for c in items)
    out = [f'<section class="sec"><div class="wrap"><div class="jump" aria-label="Разделы">{jump}</div></div></section>',
           '<section class="sec" style="padding-top:clamp(16px,2vw,28px)"><div class="wrap">']
    for c in items:
        know = ''.join(f'<li>{x}</li>' for x in c['know'])
        do = ''.join(f'<li>{x}</li>' for x in c['do'])
        out.append(f'''<article class="cx" id="{c['id']}">
  <div>
    <span class="ic">{ICONS[c['icon']]}</span>
    <h2>{E(c['title'])}</h2>
    <p class="lead">{E(c['lead'])}</p>
    <a class="btn btn-accent" href="https://t.me/RealtyMinaev" data-lead="complex">Разобрать мою ситуацию</a>
  </div>
  <div class="cx-cols">
    <div><h3>Что важно знать</h3><ul>{know}</ul></div>
    <div class="do"><h3>Что делаю я</h3><ul>{do}</ul></div>
  </div>
</article>''')
    out.append('</div></section>')
    return '\n'.join(out)


def extra(p):
    return p.get('extra_html', '')


def price(p):
    pr = p.get('price')
    if not pr:
        return ''
    cta_label, cta_topic = p['cta']
    return f'''<section class="sec">
  <div class="wrap">
    <div class="panel price">
      <div><div class="eyebrow">Стоимость</div><h2 class="h2">{E(pr['title'])}</h2><p class="lead">{E(pr['text'])}</p></div>
      <a class="btn btn-accent" href="https://t.me/RealtyMinaev" data-lead="{cta_topic}">{E(cta_label)}</a>
    </div>
  </div>
</section>'''


def faq(p):
    items = p.get('faq')
    if not items:
        return ''
    det = ''.join(f'<details><summary>{E(q)}</summary><div class="ans">{"".join(f"<p>{x}</p>" for x in a)}</div></details>' for q, a in items)
    return f'''<section class="sec">
  <div class="wrap">
    <div class="head"><div class="eyebrow">Частые вопросы</div><h2 class="h2">Отвечаю заранее</h2></div>
    <div class="faq">{det}</div>
  </div>
</section>'''


def cta(p):
    c = p['final']
    return f'''<section class="sec">
  <div class="wrap">
    <div class="cta">
      <div><div class="eyebrow">{E(c['eyebrow'])}</div><h2 class="h2">{E(c['title'])}</h2><p>{E(c['text'])}</p></div>
      <div class="btn-row">
        <a class="btn btn-metal" href="https://t.me/RealtyMinaev" data-lead="{p['cta'][1]}">{E(c['button'])}</a>
        <a class="btn btn-glass" href="tel:+79263977775">{TEL_SVG}+7 (926) 397-77-75</a>
      </div>
    </div>
  </div>
</section>'''


def more(p):
    links = ''.join(f'<a href="{x["url"]}">{E(x["crumb"])}</a>' for x in PAGES if x['slug'] != p['slug'])
    return f'''<section class="sec">
  <div class="wrap">
    <div class="head" style="margin-bottom:20px"><div class="eyebrow">Другие задачи</div></div>
    <nav class="more-links" aria-label="Другие услуги"><a href="/">Главная</a>{links}</nav>
  </div>
</section>'''


def strip_tags(s):
    return re.sub(r'<[^>]+>', '', s)


def jsonld(p):
    url = SITE + p['url']
    graph = [
        {"@type": "Service", "@id": url + "#service", "name": p['service_name'], "serviceType": p['service_name'],
         "description": p['description'], "url": url,
         "provider": {"@id": SITE + "/#agent"},
         "areaServed": {"@type": "City", "name": "Москва"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": p['crumb'], "item": url}]},
        {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": p['title'], "description": p['description'],
         "inLanguage": "ru-RU", "isPartOf": {"@id": SITE + "/#site"}, "about": {"@id": url + "#service"}},
    ]
    if p.get('faq'):
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip_tags(' '.join(a))}}
            for q, a in p['faq']]})
    return '<script type="application/ld+json">\n' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + '\n</script>'


def page_html(p):
    url = SITE + p['url']
    head = f'''<!DOCTYPE html>
<html lang="ru" data-theme="{THEME}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(p['title'])}</title>
<meta name="description" content="{E(p['description'])}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#101A2C">
{GOOGLE}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Дмитрий Минаев">
<meta property="og:locale" content="ru_RU">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{E(p['title'])}">
<meta property="og:description" content="{E(p['description'])}">
<meta property="og:image" content="{SITE}/img/og.jpg?v=fd20851e03ad">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico?v=b3d294b8a968" sizes="32x32">
<link rel="icon" href="/icon-512.png?v=61635c6374b2" type="image/png" sizes="512x512">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2dce23ee3f4f">
<link rel="preload" as="font" type="font/woff2" href="/fonts/onest-cyrillic.woff2?v=c3f4223046fb" crossorigin>
{FONTS_CSS.replace('url("fonts/', 'url("/fonts/')}
{MAIN_CSS}
{INNER_CSS}
{jsonld(p)}
<script src="/consent.js?v=1" defer></script>
<script src="/lead.js?v=1" defer></script>
</head>
<body>
<!-- Страница собрана скриптом _build/build.py из _build/pages.py. Правьте тексты там. -->
'''
    body = '\n'.join([
        topbar(p.get('nav_key')),
        '<main>',
        hero(p), work(p), extra(p), cases_page(p), info(p), complex_links(p), price(p), faq(p), cta(p), more(p),
        '<div class="page-end"></div>',
        '</main>',
        FOOTER.replace('href="/privacy/"', 'href="/privacy/"'),
        STICKY,
        MAIN_JS,
        '</body>\n</html>\n',
    ])
    return head + body


def sitemap():
    today = date.today().isoformat()
    urls = [('/', 'weekly', '1.0')] + [(p['url'], 'monthly', '0.9') for p in PAGES] + [('/forma-96/', 'monthly', '0.6')]
    rows = ''.join(f'  <url>\n    <loc>{SITE}{u}</loc>\n    <lastmod>{today}</lastmod>\n    <changefreq>{f}</changefreq>\n    <priority>{pr}</priority>\n  </url>\n'
                   for u, f, pr in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}</urlset>\n'


def main():
    for p in PAGES:
        out = ROOT / p['slug'] / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page_html(p), encoding='utf-8')
        print('собрано:', out.relative_to(ROOT))
    (ROOT / 'sitemap.xml').write_text(sitemap(), encoding='utf-8')
    print('собрано: sitemap.xml')


if __name__ == '__main__':
    main()
