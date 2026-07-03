<?php

// shop: single-product Stripe Checkout (no cart, V1) + price display.
//
// Payment flow:
//   product page form → POST /shop/checkout → Stripe Checkout Session is
//   created via plain curl (no SDK) → 303 redirect to the Stripe-hosted
//   payment page → back to the product page with ?paid=1 (or plain URL
//   on cancel). Orders live in the Stripe dashboard — no webhooks in V1.
//
// The secret key is NEVER in git (public repo): config.redobureau.com.php
// reads it from /var/www/.stripe-secret (root:www-data 640, outside the
// webroot) or the STRIPE_SECRET_KEY env var. No key / .ru host → the
// template falls back to a mail-order link, checkout POSTs bounce back
// with ?checkout=unavailable.

Kirby::plugin('rb/shop', [

    'pageMethods' => [

        // Host-aware display price: ₽ on the Russian site, the product's
        // own currency internationally. Null when unset (renders nothing).
        'displayPrice' => function () {
            if (site()->currentAudience() === 'ru') {
                if ($this->price_rub()->isEmpty()) return null;
                return number_format($this->price_rub()->toFloat(), 0, '', ' ') . ' ₽';
            }
            if ($this->price()->isEmpty()) return null;
            $symbols = ['usd' => '$', 'eur' => '€'];
            $cur = strtolower($this->currency()->or('usd')->value());
            return ($symbols[$cur] ?? strtoupper($cur) . ' ') . number_format($this->price()->toFloat(), 0, '.', ' ');
        },

    ],

    'routes' => [

        [
            'pattern' => 'shop/checkout',
            'method'  => 'POST',
            'action'  => function () {
                $slug = get('product');
                $page = page('shop/' . $slug);

                if (!$page || $page->intendedTemplate()->name() !== 'product' || !$page->audienceAllows()) {
                    return go('/', 302);
                }
                $back = $page->url();

                if ($page->stock()->value() === 'soldout') {
                    return go($back . '?checkout=soldout', 302);
                }

                $secret = option('site.stripeSecret');
                if (!$secret || site()->currentAudience() === 'ru') {
                    return go($back . '?checkout=unavailable', 302);
                }

                $currency = strtolower($page->currency()->or('usd')->value());
                $amount   = (int) round($page->price()->toFloat() * 100);
                if ($amount < 50) {
                    return go($back . '?checkout=error', 302);
                }

                $fields = [
                    'mode'                                          => 'payment',
                    'line_items[0][quantity]'                       => 1,
                    'line_items[0][price_data][currency]'           => $currency,
                    'line_items[0][price_data][unit_amount]'        => $amount,
                    'line_items[0][price_data][product_data][name]' => (string) $page->title(),
                    'success_url'                                   => $back . '?paid=1',
                    'cancel_url'                                    => $back,
                    'metadata[product]'                             => $page->slug(),
                ];
                if (($f = $page->files()->template('previewCover')->first())
                    && strpos($img = $f->resize(800)->url(), 'https://') === 0) {
                    $fields['line_items[0][price_data][product_data][images][0]'] = $img;
                }

                $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST           => true,
                    CURLOPT_POSTFIELDS     => http_build_query($fields),
                    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $secret],
                    CURLOPT_TIMEOUT        => 20,
                ]);
                $res  = curl_exec($ch);
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                $json = json_decode((string) $res, true);
                if ($code === 200 && !empty($json['url'])) {
                    return go($json['url'], 303);
                }

                $logDir = kirby()->root('site') . '/logs';
                if (!is_dir($logDir)) @mkdir($logDir, 0775, true);
                @file_put_contents(
                    $logDir . '/stripe.log',
                    '[' . date('c') . "] product={$slug} HTTP {$code} " . substr((string) $res, 0, 500) . "\n",
                    FILE_APPEND
                );
                return go($back . '?checkout=error', 302);
            },
        ],

    ],

]);
