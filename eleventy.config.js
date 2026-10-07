// Сборка сайта. Шаблоны и тексты новых страниц — в src/, готовый сайт — в _site/.
// Главная, Forma 96, картинки и шрифты пока лежат в корне как есть и копируются
// в _site без изменений. На хостинг выкладывается только содержимое _site/.
export default function (eleventyConfig) {
  for (const p of [
    "index.html", "404.html", "img", "fonts", "fonts.css", "forma-96",
    "favicon.ico", "icon-512.png", "apple-touch-icon.png",
    "robots.txt", "sitemap.xml", "yandex_00de1ec103417d0d.html",
  ]) eleventyConfig.addPassthroughCopy(p);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Хеш содержимого файла для ?v= — браузер перекачивает файл только после правки.
  eleventyConfig.addFilter("ver", async (path) => {
    const { createHash } = await import("node:crypto");
    const { readFile } = await import("node:fs/promises");
    const buf = await readFile("src" + path);
    return path + "?v=" + createHash("md5").update(buf).digest("hex").slice(0, 12);
  });

  // открыт ли раздел меню: есть ли в нём текущая страница
  eleventyConfig.addFilter("hasUrl", (items, url) => items.some((i) => i.url === url));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
