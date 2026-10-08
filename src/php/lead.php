<?php
// Заявка «Перезвоните мне».
// 1) Заявка записывается в файл на хостинге (первичная запись персональных
//    данных — на территории РФ, ч. 5 ст. 18 152-ФЗ).
// 2) Полные данные уходят на почту (лучше российский почтовый сервис).
// 3) В Telegram — только сигнал о заявке без имени и телефона. Полные данные
//    в Telegram включаются настройкой telegram_full, если подано уведомление
//    Роскомнадзору о трансграничной передаче (ч. 3 ст. 12 152-ФЗ).
// Настройки — в lead-config.php вне репозитория, образец: lead-config.example.php.

declare(strict_types=1);
date_default_timezone_set('Europe/Moscow');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

$isFetch = ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';

function done(bool $ok, string $error = ''): void {
    global $isFetch;
    if (!$isFetch) {                       // отправка без JavaScript — показываем простую страницу
        header('Content-Type: text/html; charset=utf-8');
        echo $ok
            ? '<meta charset="utf-8"><p style="font:18px sans-serif;padding:40px">Спасибо! Перезвоню в ближайшее время. <a href="/">На главную</a></p>'
            : '<meta charset="utf-8"><p style="font:18px sans-serif;padding:40px">Не получилось отправить. Позвоните: <a href="tel:+79263977775">+7 (926) 397-77-75</a></p>';
        exit;
    }
    if (!$ok) http_response_code(400);
    echo json_encode(['ok' => $ok, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') done(false, 'method');

$clean = fn(string $k, int $max) => mb_substr(trim(strip_tags((string)($_POST[$k] ?? ''))), 0, $max);
$name    = $clean('name', 60);
$phone   = $clean('phone', 30);
$page    = $clean('page', 200);
$topic   = $clean('topic', 200);
$consent = ($_POST['consent'] ?? '') === '1';

if (($_POST['website'] ?? '') !== '') done(true);              // ловушка для ботов: делаем вид, что всё хорошо
$digits = preg_replace('/\D/', '', $phone);
if (strlen($digits) < 10 || strlen($digits) > 15) done(false, 'phone');
if (!$consent) done(false, 'consent');

// не чаще одной заявки в 30 секунд с одного адреса
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$lock = sys_get_temp_dir() . '/lead_' . md5($ip);
if (is_file($lock) && time() - filemtime($lock) < 30) done(false, 'rate');
@touch($lock);

$cfg = null;
foreach ([dirname(__DIR__) . '/lead-config.php', __DIR__ . '/lead-config.php'] as $f) {
    if (is_file($f)) { $cfg = require $f; break; }
}
if (!is_array($cfg)) done(false, 'config');

$when = date('d.m.Y H:i');
$where = ($topic !== '' ? $topic : '—') . ' (' . $page . ')';

// 1. запись на хостинге — до любой отправки
$dir = $cfg['storage'] ?? dirname(__DIR__) . '/leads';
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$saved = @file_put_contents($dir . '/leads.csv',
    implode(';', array_map(fn($v) => '"' . str_replace('"', '""', $v) . '"', [$when, $name, $phone, $where, 'согласие: да'])) . "\n",
    FILE_APPEND | LOCK_EX) !== false;
if (!$saved) done(false, 'storage');

$full = "Заявка с сайта\nИмя: " . ($name !== '' ? $name : '—') . "\nТелефон: " . $phone
      . "\nСтраница: " . $where . "\nСогласие на обработку ПД: да, " . $when;
$sent = false;

// 2. почта с полными данными
if (!empty($cfg['email'])) {
    $subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта realtyminaev.ru') . '?=';
    $sent = @mail($cfg['email'], $subject, $full, "Content-Type: text/plain; charset=utf-8\r\nFrom: " . ($cfg['from'] ?? 'no-reply@realtyminaev.ru')) || $sent;
}

// 3. Telegram: по умолчанию без персональных данных
if (!empty($cfg['token']) && !empty($cfg['chat_id'])) {
    $tg = !empty($cfg['telegram_full'])
        ? $full
        : "Новая заявка с сайта\nСтраница: " . $where . "\n" . $when . "\nИмя и телефон — в почте.";
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => http_build_query(['chat_id' => $cfg['chat_id'], 'text' => $tg]),
        'timeout' => 10,
    ]]);
    $res = @file_get_contents('https://api.telegram.org/bot' . $cfg['token'] . '/sendMessage', false, $ctx);
    $sent = ($res !== false && (json_decode($res, true)['ok'] ?? false)) || $sent;
}

// заявка уже записана на хостинге — даже если уведомления не ушли, она не потеряется
done(true);
