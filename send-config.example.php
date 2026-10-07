<?php
/* Образец настроек формы заявки.
   На хостинге скопируйте этот файл в send-config.php (рядом с send.php)
   и впишите свои значения. send-config.php в GitHub не загружается. */
return [
    // Telegram: токен от @BotFather и ваш chat_id (как узнать — в инструкции)
    'tg_token'   => '1234567890:AA...',
    'tg_chat_id' => '123456789',

    // Почта для копий заявок
    'mail_to'    => 'MinaevDmitry@gmail.com',
    // Отправитель: ящик на домене сайта (создайте его в панели Рег.ру)
    'mail_from'  => 'noreply@realtyminaev.ru',
];
