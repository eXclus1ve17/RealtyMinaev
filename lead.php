<?php
// Заявка «Перезвоните мне».
// 1) Заявка записывается в файл на хостинге (первичная запись персональных
//    данных — на территории РФ, ч. 5 ст. 18 152-ФЗ).
// 2) Полные данные уходят брокеру в Telegram (через бота) и копией на почту.
// Токен бота и chat_id — только в lead-config.php вне папки сайта, его создаёт
// скрипт установки бота. Почта задана ниже; переопределить можно там же.

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
if (is_file($lock) && time() - filemtime($lock) < 30) done(true);   // повтор в течение 30 с — уже приняли
@touch($lock);

$cfg = ['email' => 'minaevdmitry@gmail.com', 'from' => 'no-reply@realtyminaev.ru', 'tg_token' => '', 'tg_chat' => '', 'tg_api' => '', 'tg_relay_key' => ''];
foreach ([dirname(__DIR__) . '/lead-config.php', __DIR__ . '/lead-config.php'] as $f) {
    if (is_file($f)) { $cfg = array_merge($cfg, (array)require $f); break; }
}

$when = date('d.m.Y H:i');
$where = ($topic !== '' ? $topic : '—') . ' (' . $page . ')';

// 1. запись на хостинге — до отправки письма
$dir = $cfg['storage'] ?? dirname(__DIR__) . '/leads';
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$log = $dir . '/leads.csv';
// срок хранения — 1 год (согласие и политика): старые строки удаляются при каждой новой заявке
if (is_file($log)) {
    $keep = [];
    foreach (file($log, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $d = DateTime::createFromFormat('d.m.Y H:i', trim(explode(';', $line)[0], '"'));
        if ($d && $d > new DateTime('-1 year')) $keep[] = $line;
    }
    @file_put_contents($log, $keep ? implode("\n", $keep) . "\n" : '', LOCK_EX);
}
$saved = @file_put_contents($log,
    implode(';', array_map(fn($v) => '"' . str_replace('"', '""', $v) . '"', [$when, $name, $phone, $where, 'согласие: да'])) . "\n",
    FILE_APPEND | LOCK_EX) !== false;

// 2. сообщение брокеру в Telegram
$tg = false;
if ($cfg['tg_token'] !== '' && $cfg['tg_chat'] !== '') {
    $h = fn(string $v) => htmlspecialchars($v, ENT_NOQUOTES, 'UTF-8');
    $text = "<b>Заявка с сайта</b>\n\nИмя: " . $h($name !== '' ? $name : '—') . "\nТелефон: " . $h($phone)
          . "\nСтраница: " . $h($where) . "\nВремя: " . $when . " (МСК)\nСогласие на обработку ПД: да";
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 8, 'ignore_errors' => true,
        'header' => "Content-Type: application/json\r\n" . ($cfg['tg_relay_key'] !== '' ? 'X-Relay-Key: ' . $cfg['tg_relay_key'] . "\r\n" : ''),
        'content' => json_encode(['chat_id' => $cfg['tg_chat'], 'text' => $text, 'parse_mode' => 'HTML'], JSON_UNESCAPED_UNICODE),
    ]]);
    // tg_api — посредник Cloudflare (из России api.telegram.org доступен нестабильно)
    $api = rtrim($cfg['tg_api'] !== '' ? $cfg['tg_api'] : 'https://api.telegram.org', '/');
    $resp = @file_get_contents($api . '/bot' . $cfg['tg_token'] . '/sendMessage', false, $ctx);
    $tg = is_string($resp) && strpos($resp, '"ok":true') !== false;
}
// 3. письмо брокеру
$body = "Заявка с сайта realtyminaev.ru\n\nИмя: " . ($name !== '' ? $name : '—') . "\nТелефон: " . $phone
      . "\nСтраница: " . $where . "\nВремя: " . $when . "\nСогласие на обработку ПД: да";
$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . ($topic !== '' ? $topic : 'перезвонить')) . '?=';
$headers = "Content-Type: text/plain; charset=utf-8\r\nFrom: " . $cfg['from'];
$mailed = @mail($cfg['email'], $subject, $body, $headers);

// заявка считается принятой, если записана или отправлена
done($saved || $tg || $mailed, ($saved || $tg || $mailed) ? '' : 'send');
