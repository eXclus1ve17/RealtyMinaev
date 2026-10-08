<?php
// Заявка «Перезвоните мне».
// 1) Заявка записывается в файл на хостинге (первичная запись персональных
//    данных — на территории РФ, ч. 5 ст. 18 152-ФЗ).
// 2) Полные данные уходят письмом на почту брокера.
// Почта задана ниже; переопределить можно в lead-config.php вне репозитория.

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

$cfg = ['email' => 'd.m.minaev@landis-estate.com', 'from' => 'no-reply@realtyminaev.ru'];
foreach ([dirname(__DIR__) . '/lead-config.php', __DIR__ . '/lead-config.php'] as $f) {
    if (is_file($f)) { $cfg = array_merge($cfg, (array)require $f); break; }
}

$when = date('d.m.Y H:i');
$where = ($topic !== '' ? $topic : '—') . ' (' . $page . ')';

// 1. запись на хостинге — до отправки письма
$dir = $cfg['storage'] ?? dirname(__DIR__) . '/leads';
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$saved = @file_put_contents($dir . '/leads.csv',
    implode(';', array_map(fn($v) => '"' . str_replace('"', '""', $v) . '"', [$when, $name, $phone, $where, 'согласие: да'])) . "\n",
    FILE_APPEND | LOCK_EX) !== false;

// 2. письмо брокеру
$body = "Заявка с сайта realtyminaev.ru\n\nИмя: " . ($name !== '' ? $name : '—') . "\nТелефон: " . $phone
      . "\nСтраница: " . $where . "\nВремя: " . $when . "\nСогласие на обработку ПД: да";
$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . ($topic !== '' ? $topic : 'перезвонить')) . '?=';
$headers = "Content-Type: text/plain; charset=utf-8\r\nFrom: " . $cfg['from'];
$mailed = @mail($cfg['email'], $subject, $body, $headers);

// заявка считается принятой, если записана или отправлена
done($saved || $mailed, ($saved || $mailed) ? '' : 'send');
