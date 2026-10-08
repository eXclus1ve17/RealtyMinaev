// Общие данные сайта: контакты и меню. Меню правится только здесь.
export default {
  // Черновик: страницы закрыты от индексации, видны пометки [ЗАПОЛНИТЬ].
  // Перед публикацией поставить false.
  draft: true,
  // Часы работы и скорость ответа — под кнопками связи. Пусто = пометка [ЗАПОЛНИТЬ].
  hours: "Пн–пт с 10 до 19, отвечаю быстро",
  email: "d.m.minaev@landis-estate.com",
  url: "https://realtyminaev.ru",
  name: "Дмитрий Минаев",
  phone: "+7 (926) 397-77-75",
  phoneHref: "tel:+79263977775",
  telegram: "https://t.me/RealtyMinaev",
  whatsapp: "https://wa.me/79263977775",
  max: "https://max.ru/u/f9LHodD0cOLOddl8uSfAqW5N_rbCdWMLwxxzn1UOibarOU6eByK8-xW5caw",
  cian: "https://www.cian.ru/agents/139925930/",
  agency: "ООО «Лендис Эстейт»",
  address: "г. Москва, БЦ Port Plaza, ул. Проектируемый проезд № 4062, д. 6, стр. 16",
  metro: "Технопарк",
  metrika: 112500819,
  // Верхнее меню. Районы и «Обо мне» — только в подвале (footer ниже).
  menu: [
    { title: "Услуги", items: [
      { title: "Продать квартиру", url: "/uslugi/prodazha-kvartiry/" },
      { title: "Купить вторичку", url: "/uslugi/pokupka-kvartiry/" },
      { title: "Новостройки — бесплатно", url: "/uslugi/novostrojki/" },
      { title: "Проверить квартиру", url: "/uslugi/proverka-kvartiry/" },
      { title: "Коммерция под доход", url: "/uslugi/kommercheskaya-nedvizhimost/" },
      { title: "Загородный дом и участок", url: "/uslugi/zagorodnaya-nedvizhimost/" },
      { title: "Услуги и стоимость", url: "/uslugi/", muted: true },
    ]},
    { title: "Сложные сделки", items: [
      { title: "Продажа доли", url: "/slozhnye-sdelki/prodazha-doli/" },
      { title: "Квартира по наследству", url: "/slozhnye-sdelki/nasledstvo/" },
      { title: "Альтернативная сделка", url: "/slozhnye-sdelki/alternativnaya-sdelka/" },
      { title: "Ипотека и обременения", url: "/slozhnye-sdelki/prodazha-v-ipoteke/" },
      { title: "Маткапитал и доли детей", url: "/slozhnye-sdelki/materinskij-kapital/" },
      { title: "Дистанционная сделка", url: "/slozhnye-sdelki/distancionnaya-sdelka/" },
      { title: "Все сложные сделки", url: "/slozhnye-sdelki/", muted: true },
    ]},
    { title: "Статьи", url: "/statyi/" },
    { title: "Контакты", url: "/kontakty/" },
  ],
};
