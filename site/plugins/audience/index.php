<?php

// Audience: lets each project declare which sites (intl / ru) it appears on.
// Used by home.row.php block, controllers/project.php, controllers/work.php.

Kirby::plugin('rb/audience', [

  'siteMethods' => [

    /**
     * Returns the audience id for the current request.
     *
     * Config-driven (site.audience in the per-host configs, which the
     * IP-alias configs include too) — so browsing by bare IP behaves
     * exactly like the real domain. Host-string sniffing remains only
     * as a fallback for unconfigured environments.
     */
    'currentAudience' => function() {
      if ($configured = option('site.audience')) {
        return $configured;
      }
      $host = $_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? '';
      return strpos($host, 'redobureau.ru') !== false ? 'ru' : 'intl';
    },

  ],

  'pageMethods' => [

    /**
     * Whether the page is allowed to render for the given audience.
     *
     * If $want is null, uses the current host's audience.
     *
     * If the page has no audience field set (legacy content created
     * before this field existed), defaults to TRUE — i.e. show
     * everywhere. This keeps the migration non-breaking: editors set
     * explicit audience on new RU-only / intl-only projects, but
     * existing content keeps rendering on both sites.
     */
    'audienceAllows' => function($want = null) {
      $want = $want ?? site()->currentAudience();
      $audience = $this->audience()->split();
      if (empty($audience)) {
        return true;
      }
      return in_array($want, $audience, true);
    },

  ],

]);
