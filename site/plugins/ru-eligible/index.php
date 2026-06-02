<?php

// ru-eligible: server-side guess whether the current visitor likely wants
// the Russian version of the site. Used on redobureau.com to decide which
// extra language buttons to surface.
//
// Three signals (any one is enough):
//   1. Explicit choice persisted as cookie  (langPref=ru)
//   2. Accept-Language header contains a Cyrillic-script language
//   3. Cloudflare's geo header (CF-IPCountry) is one of the CIS countries
//      where Russian is widely used
//
// The same checks are mirrored client-side in the inline script in
// site/snippets/header.php — that script handles "in-page reveal" of the
// RU button to keep page-cache cache-friendly (so the server can render
// one HTML and JS adapts it per visitor).

Kirby::plugin('rb/ru-eligible', [

  'siteMethods' => [

    'ruEligible' => function() {
      // 1. Cookie set by previous explicit choice
      if (($_COOKIE['langPref'] ?? null) === 'ru') {
        return true;
      }

      // 2. Browser language preference
      $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
      if (preg_match('/\b(ru|be|kk|ky|hy|uz|tg|az)\b/i', $acceptLang)) {
        return true;
      }

      // 3. Geo via Cloudflare
      $country = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? '';
      if (in_array(strtoupper($country), [
        'RU', 'BY', 'KZ', 'KG', 'AM', 'UZ', 'TJ', 'MD', 'AZ', 'GE',
      ], true)) {
        return true;
      }

      return false;
    },

  ],

]);
