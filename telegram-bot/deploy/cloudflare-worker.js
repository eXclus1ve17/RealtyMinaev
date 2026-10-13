// Посредник между Telegram и ботом на reg.ru (Cloudflare Worker).
// 1) Telegram → /webhook → пересылаем на бот (bot.realtyminaev.ru), секрет вебхука проверяет сам бот.
// 2) Бот и форма сайта → /bot<токен>/<метод> → пересылаем в api.telegram.org.
//    Пропускаем только запросы с ключом X-Relay-Key = переменная RELAY_KEY (Settings → Variables).
// 3) /banner.jpg — баннер приветствия: Telegram скачивает его отсюда, а не с reg.ru.
const BOT_ORIGIN = "https://bot.realtyminaev.ru";
const BANNER = "https://realtyminaev.ru/card/og.jpg";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/webhook" && request.method === "POST") {
      const r = await fetch(BOT_ORIGIN + "/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "",
        },
        body: await request.arrayBuffer(),
      });
      return new Response(await r.text(), { status: r.status });
    }

    if (url.pathname.startsWith("/bot")) {
      if (!env.RELAY_KEY || request.headers.get("X-Relay-Key") !== env.RELAY_KEY) {
        return new Response("forbidden", { status: 403 });
      }
      const headers = new Headers();
      const ct = request.headers.get("Content-Type");
      if (ct) headers.set("Content-Type", ct);
      const r = await fetch("https://api.telegram.org" + url.pathname, {
        method: request.method,
        headers,
        body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      });
      return new Response(r.body, {
        status: r.status,
        headers: { "Content-Type": r.headers.get("Content-Type") || "application/json" },
      });
    }

    if (url.pathname === "/banner.jpg") {
      const r = await fetch(BANNER, { cf: { cacheEverything: true, cacheTtl: 86400 } });
      return new Response(r.body, { status: r.status, headers: { "Content-Type": "image/jpeg" } });
    }

    if (url.pathname === "/health") {
      const r = await fetch(BOT_ORIGIN + "/health").catch(() => null);
      return new Response("relay ok; bot: " + (r ? await r.text() : "нет ответа"));
    }

    return new Response("not found", { status: 404 });
  },
};
