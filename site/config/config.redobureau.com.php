<?php

// Host-specific config for redobureau.com (international site).
// Auto-loaded by Kirby on top of config.php when SERVER_NAME = redobureau.com.

return [
  // Audience of this host (plugins/audience): project/product filtering
  // and ₽-vs-$ pricing key off this, not off the host string — so the
  // IP-alias config keeps bare-IP browsing identical to the real domain.
  'site.audience' => 'intl',

  // UI-visible languages on the international site.
  // RU page rendering still works (URLs like /ru/work resolve), the switcher
  // just doesn't expose RU unless ru-eligible (see plugin in phase 4).
  'site.activeLanguages' => ['en', 'es'],

  // Languages rendered in the switcher as hidden [data-optional] buttons,
  // revealed client-side for ru-eligible visitors. Languages listed in
  // neither option are not rendered at all.
  'site.optionalLanguages' => ['ru'],

  // Hard domain separation: RU lives on redobureau.ru only. The switcher's
  // RU button and hreflang tags point cross-domain (see plugins/lang-hosts).
  'site.externalLanguages' => [
    'ru' => 'https://redobureau.ru',
  ],

  // Canonical origin for SEO surfaces (canonical link, hreflang, sitemap,
  // robots, JSON-LD) — always the real domain, even when browsing by IP.
  'site.canonicalBase' => 'https://redobureau.com',

  // Calendly booking link for landing CTAs (null = mailto fallback).
  'site.calendlyUrl' => null,

  // Ad & analytics pixels (see snippets/analytics.php). Fill in the IDs
  // as the ad accounts get created — null means "not rendered".
  // No Yandex anything on the international site.
  'site.analytics' => [
    'ga4'      => null, // Google Analytics 4, e.g. 'G-XXXXXXXXXX'
    'meta'     => null, // Meta (FB/IG) Pixel ID, e.g. '1234567890123456'
    'linkedin' => null, // LinkedIn Insight partner id, e.g. '1234567'
  ],

  // GDPR consent banner: marketing pixels fire only after Accept
  // (GA4 runs in Consent Mode v2 with defaults=denied until then).
  'site.consentBanner' => 'gdpr',

  // Hidden-section switches: flip to true to reveal the nav link, drop
  // the noindex meta and let the section into the sitemap. One line +
  // git pull = launch.
  'site.navJournal' => false,
  'site.navShop'    => false,
  'site.navTools'   => true,

  // Stripe secret key — NEVER commit it (public repo). Lives on the
  // server: `echo 'sk_live_…' > /var/www/.stripe-secret` (root:www-data,
  // chmod 640), or the STRIPE_SECRET_KEY env var in the FPM pool.
  // Absent key = shop buttons fall back to mail-order.
  'site.stripeSecret' => $_SERVER['STRIPE_SECRET_KEY']
      ?? (is_readable('/var/www/.stripe-secret')
          ? trim((string) file_get_contents('/var/www/.stripe-secret'))
          : null),

  // Webhook endpoint secret (whsec_…) — from Stripe dashboard →
  // Developers → Webhooks → endpoint https://redobureau.com/shop/webhook,
  // event: checkout.session.completed. Same storage rules as above.
  'site.stripeWebhookSecret' => $_SERVER['STRIPE_WEBHOOK_SECRET']
      ?? (is_readable('/var/www/.stripe-webhook-secret')
          ? trim((string) file_get_contents('/var/www/.stripe-webhook-secret'))
          : null),

  // Shipping in Stripe Checkout: address collected for these countries,
  // flat rate charged per currency (minor units — 2500 = $25.00).
  'site.shopShipping' => [
    'allowed_countries' => [
      'US','CA','GB','IE','DE','FR','ES','IT','PT','NL','BE','AT','CH',
      'SE','NO','DK','FI','PL','CZ','GR','AR','BR','MX','CL','UY','CO',
      'AU','NZ','JP','KR','SG','HK','AE','IL',
    ],
    'label' => 'Worldwide shipping (tracked)',
    'flat'  => ['usd' => 2500, 'eur' => 2300], // TODO: real rates
  ],

  // Flip ONLY after enabling Stripe Tax in the dashboard — otherwise
  // session creation fails.
  'site.shopStripeTax' => false,

  // Contact form — addresses for $kirby->email() inside controllers/contacts.php.
  // SMTP itself is intentionally not configured anywhere yet (user request).
  // When SMTP gets enabled, the credentials live here, not in code.
  'site.contactFrom' => 'noreply@redobureau.com',
  'site.contactTo'   => 'marina@redobureau.com',

  // Panel is administered from .com only.
  'panel' => [
    'install' => true,
  ],

  // Page cache prefix isolates entries from the .ru deploy (in case the
  // same Kirby checkout is ever shared across hosts in dev).
  'cache.pages' => [
    'active' => true,
    'prefix' => 'com',
  ],

  'routes' => [
    // Hard domain separation: the Russian version is served by
    // redobureau.ru only. Any /ru URL on .com (bookmarks, old index)
    // permanently moves to the Russian domain; the bare /ru goes to its
    // root (the Russian home lives at redobureau.ru/, see site.langRoots).
    [
      'pattern' => 'ru/(:all?)',
      'action'  => fn($path = null) => go('https://redobureau.ru' . ($path ? '/ru/' . $path : '/'), 301),
    ],

    // The EN home lives at the bare root — /en (old bookmarks, switcher
    // hops) permanently moves to /, preserving the query string
    // (?setlang=en from the .ru "Redo Global" link must survive).
    [
      'pattern' => 'en',
      'action'  => function () {
        $qs = $_SERVER['QUERY_STRING'] ?? '';
        return go('/' . ($qs ? '?' . $qs : ''), 301);
      },
    ],

    // Root: language dispatch, then the ENGLISH HOMEPAGE RENDERS RIGHT
    // HERE (200, no redirect). SEO-safe per Google's locale-adaptive
    // guidance: only the bare root dispatches, deep URLs always resolve
    // directly, redirects are 302, hreflang+x-default are in place, and
    // an explicit prior choice (langPref cookie) always wins.
    [
      'pattern' => '/',
      'action'  => function () {
        // 0. ?setlang=xx (e.g. "Redo Global" from the .ru site) — honor
        //    and persist server-side, BEFORE any Accept-Language logic,
        //    otherwise a russophone would bounce straight back to .ru.
        $set = get('setlang');
        if (in_array($set, ['en', 'es', 'ru'], true)) {
          setcookie('langPref', $set, time() + 31536000, '/');
          $_COOKIE['langPref'] = $set;
        }

        // 1. Explicit previous choice wins.
        $pref = $_COOKIE['langPref'] ?? null;
        if ($pref === 'ru') return go('https://redobureau.ru/', 302);
        if ($pref === 'es') return go('/es', 302);

        if ($pref !== 'en') {
          // 2. Russian anywhere in Accept-Language → Russian site.
          $al = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
          if (preg_match('/\bru\b/', $al)) {
            return go('https://redobureau.ru/', 302);
          }

          // 3. Otherwise the highest-weighted language we serve here.
          $prefs = [];
          foreach (explode(',', $al) as $part) {
            $bits = explode(';', trim($part));
            $code = substr(trim($bits[0]), 0, 2);
            if ($code === '' || $code === '*') continue;
            $q = 1.0;
            foreach ($bits as $b) {
              if (preg_match('/^q=([0-9.]+)$/', trim($b), $m)) $q = (float)$m[1];
            }
            $prefs[$code] = max($prefs[$code] ?? 0, $q);
          }
          arsort($prefs);
          foreach (array_keys($prefs) as $code) {
            if ($code === 'es') return go('/es', 302);
            if ($code === 'en') break;
          }
        }

        // 4. English homepage at the bare root (bots and en-visitors).
        return site()->visit(page('home'), 'en');
      },
    ],
  ],

  // sync-to-ru (phase 6): admin button to push content/ from this server
  // to redobureau.ru via rsync over SSH. Key pair: /var/www/.ssh/sync_ed25519
  // on this server (owned by www-data), public half authorized for
  // deploy@213.171.15.113 (deploy is in the www-data group, content dir
  // is group-writable).
  'rb.sync-to-ru' => [
    'enabled' => true,
    'host'    => '213.171.15.113',
    'user'    => 'deploy',
    'path'    => '/var/www/redobureau.ru/content/',
    'sshKey'  => '/var/www/.ssh/sync_ed25519',
  ],
];
