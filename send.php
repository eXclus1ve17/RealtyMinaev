<?php
/* ============================================================
   Приём заявок с сайта realtyminaev.ru
   → сообщение в Telegram (бот) + письмо на почту + запасной лог.

   Настройки (токен бота, chat_id, почта) лежат в send-config.php
   рядом с этим файлом. Его нет в GitHub: создайте на хостинге
   по образцу send-config.example.php.
   ============================================================ */

date_default_timezone_set('Europe/Moscow');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

function out($ok, $error = null, $code = 200) {
    http_response_code($code);
    echo json_encode($error ? ['ok' => $ok, 'error' => $error] : ['ok' => $ok], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(false, 'Метод не поддерживается', 405);

$cfgFile = __DIR__ . '/send-config.php';
if (!is_file($cfgFile)) out(false, 'Форма временно не настроена. Напишите в Telegram или позвоните.', 500);
$cfg = require $cfgFile;

/* ---------- антиспам ---------- */
// скрытое поле: человек его не видит и не заполняет
if (!empty($_POST['website'])) out(true);
// форму заполнили быстрее чем за 3 секунды — бот
if ((int)($_POST['t'] ?? 0) < 3) out(true);

// не больше 5 заявок с одного IP за 10 минут
$ip = $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
$ip = trim(explode(',', $ip)[0]);
$rlFile = rtrim(sys_get_temp_dir(), '/') . '/rm_rl_' . md5($ip);
$now = time();
$hits = [];
if (is_file($rlFile)) {
    $hits = array_filter(array_map('intval', explode(',', (string)@file_get_contents($rlFile))), function ($t) use ($now) { return $t > $now - 600; });
}
if (count($hits) >= 5) out(false, 'Слишком много заявок подряд. Позвоните, пожалуйста: +7 (926) 397-77-75.', 429);
$hits[] = $now;
@file_put_contents($rlFile, implode(',', $hits));

/* ---------- данные ---------- */
function field($k, $max) {
    $v = trim((string)($_POST[$k] ?? ''));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    return mb_substr($v, 0, $max, 'UTF-8');
}
$topics = [
    'sell' => 'Продажа / оценка квартиры', 'second' => 'Покупка вторички', 'new' => 'Новостройка',
    'comm' => 'Коммерция под доход', 'country' => 'Загородная', 'complex' => 'Сложная сделка', 'general' => 'Общий вопрос',
];
$topicKey = field('topic', 20);
$topic    = $topics[$topicKey] ?? $topics['general'];
$name     = field('name', 80);
$phone    = field('phone', 30);
$message  = field('message', 1500);
$address  = field('address', 200);
$rooms    = field('rooms', 10);
$area     = field('area', 10);
$channel  = in_array($_POST['channel'] ?? '', ['Telegram', 'WhatsApp', 'MAX', 'Звонок'], true) ? $_POST['channel'] : '';
$page     = field('page', 200);
$ref      = field('ref', 200);
$utm      = field('utm', 300);

$digits = preg_replace('/\D/', '', $phone);
if ($name === '') out(false, 'Укажите имя.', 422);
if (strlen($digits) < 10 || strlen($digits) > 15) out(false, 'Проверьте номер телефона.', 422);
if (($_POST['consent'] ?? '') !== '1') out(false, 'Нужно согласие на обработку данных.', 422);

/* ---------- текст заявки ---------- */
$lines = [];
$lines[] = '🏠 Заявка: ' . $topic;
if ($address !== '') $lines[] = 'Адрес: ' . $address;
if ($rooms !== '' || $area !== '') $lines[] = 'Комнат: ' . ($rooms ?: '—') . ' · Площадь: ' . ($area ?: '—') . ' м²';
$lines[] = 'Имя: ' . $name;
$lines[] = 'Телефон: ' . $phone;
if ($channel !== '') $lines[] = 'Ответить: ' . $channel;
if ($message !== '') $lines[] = "Комментарий:\n" . $message;
$lines[] = '';
$lines[] = 'Страница: ' . ($page ?: '/');
if ($utm !== '') $lines[] = 'UTM: ' . $utm;
elseif ($ref !== '') $lines[] = 'Откуда: ' . $ref;
$lines[] = 'Время: ' . date('d.m.Y H:i');
$text = implode("\n", $lines);

/* ---------- отправка ---------- */
$sent = false;

// 1. Telegram
if (!empty($cfg['tg_token']) && !empty($cfg['tg_chat_id'])) {
    $url = rtrim($cfg['tg_api'] ?? 'https://api.telegram.org', '/') . '/bot' . $cfg['tg_token'] . '/sendMessage';
    $payload = http_build_query(['chat_id' => $cfg['tg_chat_id'], 'text' => $text, 'disable_web_page_preview' => 'true']);
    $resp = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 8]);
        $resp = curl_exec($ch);
        curl_close($ch);
    } else {
        $resp = @file_get_contents($url, false, stream_context_create(['http' => [
            'method' => 'POST', 'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $payload, 'timeout' => 8]]));
    }
    if ($resp && strpos($resp, '"ok":true') !== false) $sent = true;
}

// 2. Почта
if (!empty($cfg['mail_to'])) {
    $from = $cfg['mail_from'] ?? ('noreply@' . preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'realtyminaev.ru'));
    $subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . $topic . ' — ' . $name) . '?=';
    $headers = "From: realtyminaev.ru <{$from}>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
    if (@mail($cfg['mail_to'], $subject, $text, $headers, '-f' . $from)) $sent = true;
}

// 3. Запасной лог — на случай, если и Telegram, и почта недоступны
$log = $cfg['log_file'] ?? (dirname(__DIR__) . '/realtyminaev-leads.log');
@file_put_contents($log, str_repeat('-', 40) . "\n" . $text . "\n", FILE_APPEND | LOCK_EX);

if (!$sent) out(false, 'Не получилось отправить. Напишите в Telegram или позвоните +7 (926) 397-77-75.', 502);
out(true);
