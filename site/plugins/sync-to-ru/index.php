<?php

// sync-to-ru: admin-only UI for pushing content/ from redobureau.com to
// redobureau.ru via rsync over SSH.
//
// Usage:
//   1. Configure the options block (host, user, path, sshKey, enabled)
//      in site/config/config.redobureau.com.php
//   2. Generate an SSH key on the .com server, readable by the user that
//      runs PHP-FPM (often www-data). Add the matching public key to the
//      deploy user's authorized_keys on the .ru server.
//   3. Sign into the Kirby panel as admin
//   4. Open https://redobureau.com/sync-to-ru → click "Sync now"
//
// Security: GET /sync-to-ru and POST /api/rb-sync-to-ru both require an
// authenticated admin session. The POST also requires matching Origin /
// Referer (cheap CSRF check). Disabled by default — set 'enabled' => true
// in options to arm it.

Kirby::plugin('rb/sync-to-ru', [

    'options' => [
        'enabled' => false,
        'host'    => '201.51.2.132',
        'user'    => 'deploy',
        'path'    => '/var/www/redobureau.ru/content/',
        // Path to SSH private key on the .com server, readable by the PHP
        // user. Required — rsync over SSH refuses to use a key with permissive
        // file modes, so chmod 600 and own it by the PHP user.
        'sshKey'  => null,
    ],

    'routes' => [

        [
            'pattern' => 'sync-to-ru',
            'method'  => 'GET',
            'action'  => function () {
                if (!sync_to_ru_require_admin()) {
                    return go('panel', 302);
                }
                $enabled = option('rb.sync-to-ru.enabled', false);
                $host    = option('rb.sync-to-ru.host');
                return sync_to_ru_render_page($enabled, $host);
            },
        ],

        [
            'pattern' => 'api/rb-sync-to-ru',
            'method'  => 'POST',
            'action'  => function () {
                if (!sync_to_ru_require_admin()) {
                    return new Kirby\Http\Response(
                        json_encode(['ok' => false, 'msg' => 'Forbidden']),
                        'application/json', 403
                    );
                }

                // Cheap CSRF: require same-origin POST (Origin or Referer
                // must start with the configured Kirby URL).
                $origin   = $_SERVER['HTTP_ORIGIN']  ?? $_SERVER['HTTP_REFERER'] ?? '';
                $expected = rtrim(kirby()->url(), '/');
                if (strpos($origin, $expected) !== 0) {
                    return new Kirby\Http\Response(
                        json_encode(['ok' => false, 'msg' => 'CSRF check failed']),
                        'application/json', 403
                    );
                }

                if (!option('rb.sync-to-ru.enabled', false)) {
                    return new Kirby\Http\Response(
                        json_encode(['ok' => false, 'msg' => 'Sync is disabled in config (set rb.sync-to-ru.enabled = true)']),
                        'application/json', 503
                    );
                }

                $host = option('rb.sync-to-ru.host');
                $user = option('rb.sync-to-ru.user');
                $path = option('rb.sync-to-ru.path');
                $key  = option('rb.sync-to-ru.sshKey');

                if (!$host || !$user || !$path || !$key) {
                    return new Kirby\Http\Response(
                        json_encode(['ok' => false, 'msg' => 'Missing required option (host/user/path/sshKey)']),
                        'application/json', 500
                    );
                }

                if (!is_readable($key)) {
                    return new Kirby\Http\Response(
                        json_encode(['ok' => false, 'msg' => "SSH key not readable by PHP user: $key"]),
                        'application/json', 500
                    );
                }

                $src = rtrim(kirby()->root('content'), '/') . '/';
                $sshCmd = sprintf(
                    'ssh -i %s -o StrictHostKeyChecking=accept-new -o BatchMode=yes',
                    escapeshellarg($key)
                );
                $cmd = sprintf(
                    'rsync -avz --delete -e %s %s %s@%s:%s 2>&1',
                    escapeshellarg($sshCmd),
                    escapeshellarg($src),
                    escapeshellarg($user),
                    escapeshellarg($host),
                    escapeshellarg($path)
                );

                $output = [];
                $code = 0;
                exec($cmd, $output, $code);

                // Log to site/logs for audit. Mkdir if missing.
                $logDir = kirby()->root('site') . '/logs';
                if (!is_dir($logDir)) @mkdir($logDir, 0775, true);
                if (is_dir($logDir) && is_writable($logDir)) {
                    $admin = kirby()->user() ? kirby()->user()->email() : 'unknown';
                    $line = sprintf(
                        "[%s] by=%s code=%d\n%s\n----\n",
                        date('c'), $admin, $code, implode("\n", $output)
                    );
                    @file_put_contents($logDir . '/sync-to-ru.log', $line, FILE_APPEND);
                }

                return new Kirby\Http\Response(
                    json_encode([
                        'ok'     => $code === 0,
                        'code'   => $code,
                        'output' => implode("\n", $output),
                    ]),
                    'application/json',
                    $code === 0 ? 200 : 500
                );
            },
        ],

    ],

]);

// Helper: confirm there's an authenticated admin session.
function sync_to_ru_require_admin(): bool {
    $user = kirby()->user();
    if (!$user) return false;
    return $user->role() && $user->role()->name() === 'admin';
}

// Helper: render the minimal admin UI page.
function sync_to_ru_render_page(bool $enabled, ?string $host): string {
    $hostEsc = htmlspecialchars($host ?? '(not configured)');
    $status  = $enabled
        ? '<span style="color:#0a0">enabled</span>'
        : '<span style="color:#c00">disabled in config — set rb.sync-to-ru.enabled = true</span>';
    $btnAttrs = $enabled ? '' : 'disabled';

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sync content → redobureau.ru</title>
<meta name="robots" content="noindex">
<style>
  body { font: 14px/1.4 -apple-system, system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #222; }
  h1 { font-size: 18px; margin-bottom: 6px; }
  .meta { color: #666; margin-bottom: 24px; font-size: 13px; }
  button { font: inherit; padding: 8px 18px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  pre { background: #f3f3f3; padding: 12px; max-height: 60vh; overflow: auto; white-space: pre-wrap; word-break: break-all; }
  .ok { color: #0a0; font-weight: bold; }
  .fail { color: #c00; font-weight: bold; }
</style>
</head>
<body>
<h1>Sync content → redobureau.ru</h1>
<div class="meta">
  Target: $hostEsc &nbsp;·&nbsp; Status: $status
</div>
<button id="sync" $btnAttrs>Sync now</button>
<pre id="output">(not run yet)</pre>
<script>
document.getElementById('sync').addEventListener('click', async function () {
  var btn = this;
  var out = document.getElementById('output');
  btn.disabled = true;
  out.textContent = 'Running rsync...';
  try {
    var res = await fetch('/api/rb-sync-to-ru', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });
    var json = await res.json();
    var head = json.ok
      ? '<span class="ok">✓ sync ok (exit ' + json.code + ')</span>'
      : '<span class="fail">✗ failed (exit ' + (json.code !== undefined ? json.code : '?') + '): ' + (json.msg || '') + '</span>';
    out.innerHTML = head + '\n\n' + (json.output || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  } catch (e) {
    out.textContent = 'Network/JS error: ' + e.message;
  } finally {
    btn.disabled = false;
  }
});
</script>
</body>
</html>
HTML;
}
