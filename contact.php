<?php
// «Сохранить контакт» в мини-приложении Telegram.
// Telegram не даёт мини-приложению открыть Safari или карточку контакта, поэтому бот присылает
// карточку контакта в чат клиента — там кнопка «Добавить».
// Запрос подписан Telegram (initData): проверяем подпись токеном бота, берём id клиента только из неё.
// Токен бота — в lead-config.php вне папки сайта (его создаёт скрипт установки бота).

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

function out(bool $ok, string $error = '', int $code = 200): void {
    http_response_code($ok ? 200 : $code);
    echo json_encode(['ok' => $ok, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(false, 'method', 405);

$cfg = ['tg_token' => '', 'tg_api' => '', 'tg_relay_key' => ''];
foreach ([dirname(__DIR__) . '/lead-config.php', __DIR__ . '/lead-config.php'] as $f) {
    if (is_file($f)) { $cfg = array_merge($cfg, (array)require $f); break; }
}
if ($cfg['tg_token'] === '') out(false, 'config', 500);

// 1. Проверка подписи Telegram (core.telegram.org/bots/webapps — Validating data received via the Mini App)
$init = (string)($_POST['initData'] ?? '');
parse_str($init, $data);
$hash = (string)($data['hash'] ?? '');
unset($data['hash']);
ksort($data);
$check = implode("\n", array_map(fn($k, $v) => $k . '=' . $v, array_keys($data), $data));
$secret = hash_hmac('sha256', $cfg['tg_token'], 'WebAppData', true);
if ($hash === '' || !hash_equals(hash_hmac('sha256', $check, $secret), $hash)) out(false, 'sign', 403);
if (time() - (int)($data['auth_date'] ?? 0) > 86400) out(false, 'old', 403);
$user = json_decode((string)($data['user'] ?? ''), true);
$uid = (int)($user['id'] ?? 0);
if ($uid <= 0) out(false, 'user', 403);

// не чаще раза в 20 секунд для одного клиента
$lock = sys_get_temp_dir() . '/contact_' . md5((string)$uid);
if (is_file($lock) && time() - filemtime($lock) < 20) out(true);
@touch($lock);

// 2. Карточка контакта: тот же vCard, что на сайте, без фото (Telegram принимает до 2 КБ)
$vcf = @file_get_contents(__DIR__ . '/card/minaev.vcf') ?: '';
$vcf = preg_replace("/\r?\n[ \t]/", '', $vcf);
$vcard = implode("\r\n", array_filter(preg_split("/\r?\n/", $vcf), fn($l) => $l !== '' && strpos($l, 'PHOTO') !== 0)) . "\r\n";

$api = rtrim($cfg['tg_api'] !== '' ? $cfg['tg_api'] : 'https://api.telegram.org', '/') . '/bot' . $cfg['tg_token'] . '/';
function tg(string $url, array $payload, string $key): array {
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 8, 'ignore_errors' => true, 'user_agent' => 'RealtyMinaevSite/1.0',
        'header' => "Content-Type: application/json\r\n" . ($key !== '' ? 'X-Relay-Key: ' . $key . "\r\n" : ''),
        'content' => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]]);
    $r = @file_get_contents($url, false, $ctx);
    return is_string($r) ? (json_decode($r, true) ?: []) : [];
}

$contact = ['chat_id' => $uid, 'phone_number' => '+79263977775', 'first_name' => 'Дмитрий', 'last_name' => 'Минаев | Риелтор'];
if (strlen($vcard) > 20 && strlen($vcard) <= 2048) $contact['vcard'] = $vcard;
$r = tg($api . 'sendContact', $contact, $cfg['tg_relay_key']);
if (empty($r['ok'])) {
    @unlink($lock);
    // 403 — клиент не запускал бота: мини-приложение попросит разрешение и повторит
    out(false, (($r['error_code'] ?? 0) === 403) ? 'forbidden' : 'send', 502);
}
tg($api . 'sendMessage', [
    'chat_id' => $uid, 'parse_mode' => 'HTML', 'link_preview_options' => ['is_disabled' => true],
    'text' => "Нажмите «Добавить» на карточке выше, чтобы сохранить контакт.\n\nПолная карточка с фото и ссылками: <a href=\"https://realtyminaev.ru/card/\">realtyminaev.ru/card</a> → «Сохранить контакт».",
], $cfg['tg_relay_key']);
out(true);
