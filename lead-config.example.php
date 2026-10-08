<?php
// Необязательные настройки заявки. По умолчанию письма идут на d.m.minaev@landis-estate.com
// (задано в src/php/lead.php). Если нужно поменять — скопируйте в lead-config.php
// и положите на хостинг уровнем выше папки сайта. В репозиторий файл не попадает.
return [
    'email'   => 'd.m.minaev@landis-estate.com',
    'from'    => 'no-reply@realtyminaev.ru',
    // 'storage' => '/home/USER/leads',   // папка журнала заявок вне веб-доступа
];
