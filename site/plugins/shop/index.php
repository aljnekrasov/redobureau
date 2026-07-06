<?php

// shop: Stripe Checkout (single product, V1) + orders + inventory.
//
// Payment flow:
//   product page form → POST /shop/checkout → Stripe Checkout Session
//   (plain curl, no SDK) → Stripe-hosted payment page → back to the
//   product page with ?paid=1.
//
// Order flow (stage 2):
//   Stripe fires checkout.session.completed → POST /shop/webhook →
//   signature verified (HMAC-SHA256, no SDK) → order page created under
//   content/orders (visible in the panel), product quantity decremented,
//   auto-soldout at 0, notification email attempted (silently skipped
//   until SMTP is configured — orders are never lost, Stripe retries on
//   non-2xx and the dashboard keeps everything anyway).
//
// Secrets — NEVER in git (public repo), read from files on the server:
//   /var/www/.stripe-secret          sk_live_… (checkout)
//   /var/www/.stripe-webhook-secret  whsec_…   (webhook endpoint secret)

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

        // Sold out = explicit stock flag OR a tracked quantity that hit 0.
        // Empty quantity means "not tracked" (unlimited).
        'isSoldOut' => function () {
            if ($this->stock()->value() === 'soldout') return true;
            return $this->quantity()->isNotEmpty() && $this->quantity()->toInt() < 1;
        },

    ],

    'routes' => [

        // ── Checkout ────────────────────────────────────────────────
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

                if ($page->isSoldOut()) {
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
                    'success_url'                                   => rb_shop_status_url($back),
                    'cancel_url'                                    => $back,
                    'metadata[products]'                            => json_encode([['slug' => $page->slug(), 'qty' => 1]]),
                ];
                if (($f = $page->files()->template('previewCover')->first())
                    && strpos($img = $f->resize(800)->url(), 'https://') === 0) {
                    $fields['line_items[0][price_data][product_data][images][0]'] = $img;
                }

                // Shipping: collect the address; add a flat rate when one
                // is configured for this currency.
                if ($ship = option('site.shopShipping')) {
                    foreach (array_values($ship['allowed_countries'] ?? []) as $i => $cc) {
                        $fields["shipping_address_collection[allowed_countries][$i]"] = $cc;
                    }
                    if (($flat = $ship['flat'][$currency] ?? null) !== null) {
                        $fields['shipping_options[0][shipping_rate_data][type]'] = 'fixed_amount';
                        $fields['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] = $flat;
                        $fields['shipping_options[0][shipping_rate_data][fixed_amount][currency]'] = $currency;
                        $fields['shipping_options[0][shipping_rate_data][display_name]'] = $ship['label'] ?? 'Shipping';
                    }
                }

                // Stripe Tax — flip site.shopStripeTax AFTER enabling
                // Stripe Tax in the dashboard (session creation fails
                // otherwise).
                if (option('site.shopStripeTax', false)) {
                    $fields['automatic_tax[enabled]'] = 'true';
                }

                [$code, $res] = rb_shop_stripe_post('https://api.stripe.com/v1/checkout/sessions', $fields, $secret);
                $json = json_decode((string) $res, true);
                if ($code === 200 && !empty($json['url'])) {
                    return go($json['url'], 303);
                }
                rb_shop_log("checkout product={$slug} HTTP {$code} " . substr((string) $res, 0, 400));
                return go($back . '?checkout=error', 302);
            },
        ],

        // ── Cart checkout: JSON {items:[{slug,qty}]} → Stripe session ──
        // Returns JSON {url} — prices and availability are re-validated
        // against content; the client cart is never trusted.
        [
            'pattern' => 'shop/checkout-cart',
            'method'  => 'POST',
            'action'  => function () {
                $fail = fn(string $msg, int $code = 400) =>
                    new Kirby\Http\Response(json_encode(['error' => $msg]), 'application/json', $code);

                $secret = option('site.stripeSecret');
                if (!$secret || site()->currentAudience() === 'ru') {
                    return $fail('Checkout is not available yet', 503);
                }

                $body  = json_decode(file_get_contents('php://input'), true);
                $items = $body['items'] ?? [];
                if (!$items || count($items) > 20) return $fail('Bad cart');

                $fields = [
                    'mode'        => 'payment',
                    'success_url' => rb_shop_status_url(url('/')),
                    'cancel_url'  => ($c = page('shop/cart')) ? $c->url() : url('/'),
                ];
                $currency = null;
                $meta = [];

                foreach (array_values($items) as $i => $it) {
                    $p = page('shop/' . ($it['slug'] ?? ''));
                    if (!$p || $p->intendedTemplate()->name() !== 'product'
                        || !$p->audienceAllows() || $p->isSoldOut()) {
                        return $fail('Item unavailable: ' . ($it['slug'] ?? '?'));
                    }
                    $qty = max(1, min(10, (int) ($it['qty'] ?? 1)));
                    $cur = strtolower($p->currency()->or('usd')->value());
                    $currency = $currency ?? $cur;
                    if ($cur !== $currency) return $fail('Mixed currencies in cart');
                    $amount = (int) round($p->price()->toFloat() * 100);
                    if ($amount < 50) return $fail('Bad price: ' . $p->slug());

                    $fields["line_items[$i][quantity]"] = $qty;
                    $fields["line_items[$i][price_data][currency]"] = $cur;
                    $fields["line_items[$i][price_data][unit_amount]"] = $amount;
                    $fields["line_items[$i][price_data][product_data][name]"] = (string) $p->title();
                    if (($f = $p->files()->template('previewCover')->first())
                        && strpos($img = $f->resize(800)->url(), 'https://') === 0) {
                        $fields["line_items[$i][price_data][product_data][images][0]"] = $img;
                    }
                    $meta[] = ['slug' => $p->slug(), 'qty' => $qty];
                }
                $fields['metadata[products]'] = json_encode($meta);

                if ($ship = option('site.shopShipping')) {
                    foreach (array_values($ship['allowed_countries'] ?? []) as $i => $cc) {
                        $fields["shipping_address_collection[allowed_countries][$i]"] = $cc;
                    }
                    if (($flat = $ship['flat'][$currency] ?? null) !== null) {
                        $fields['shipping_options[0][shipping_rate_data][type]'] = 'fixed_amount';
                        $fields['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] = $flat;
                        $fields['shipping_options[0][shipping_rate_data][fixed_amount][currency]'] = $currency;
                        $fields['shipping_options[0][shipping_rate_data][display_name]'] = $ship['label'] ?? 'Shipping';
                    }
                }
                if (option('site.shopStripeTax', false)) $fields['automatic_tax[enabled]'] = 'true';

                [$code, $res] = rb_shop_stripe_post('https://api.stripe.com/v1/checkout/sessions', $fields, $secret);
                $json = json_decode((string) $res, true);
                if ($code === 200 && !empty($json['url'])) {
                    return new Kirby\Http\Response(json_encode(['url' => $json['url']]), 'application/json', 200);
                }
                rb_shop_log('checkout-cart HTTP ' . $code . ' ' . substr((string) $res, 0, 400));
                return $fail('Payment provider error — try again', 502);
            },
        ],

        // ── Webhook ─────────────────────────────────────────────────
        [
            'pattern' => 'shop/webhook',
            'method'  => 'POST',
            'action'  => function () {
                $whsec = option('site.stripeWebhookSecret');
                if (!$whsec) {
                    return new Kirby\Http\Response('{"error":"webhook not configured"}', 'application/json', 503);
                }

                $payload = file_get_contents('php://input');
                if (!rb_shop_verify_signature($payload, $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '', $whsec)) {
                    rb_shop_log('webhook: bad signature');
                    return new Kirby\Http\Response('{"error":"bad signature"}', 'application/json', 400);
                }

                $event = json_decode($payload, true);
                if (($event['type'] ?? '') !== 'checkout.session.completed') {
                    return new Kirby\Http\Response('{"received":true,"ignored":true}', 'application/json', 200);
                }

                $s = $event['data']['object'] ?? [];
                $sid = $s['id'] ?? '';
                if (!$sid) {
                    return new Kirby\Http\Response('{"error":"no session id"}', 'application/json', 400);
                }

                kirby()->impersonate('kirby');
                $defaultLang = kirby()->defaultLanguage()->code();

                // Parent page for orders — created on first order. Look
                // among drafts too: page() only finds published pages, and
                // a half-created draft parent must not cause duplicates.
                $orders = site()->childrenAndDrafts()->find('orders');
                if (!$orders) {
                    $orders = site()->createChild([
                        'slug'     => 'orders',
                        'template' => 'orders',
                        'content'  => ['title' => 'Orders'],
                    ]);
                }
                if ($orders->isDraft()) {
                    try { $orders = $orders->changeStatus('unlisted'); } catch (Throwable $e) {
                        rb_shop_log('webhook: orders parent stays draft (' . $e->getMessage() . ')');
                    }
                }

                // Idempotency: Stripe retries — one order per session id.
                foreach ($orders->childrenAndDrafts() as $existing) {
                    if ($existing->sessionId()->value() === $sid) {
                        return new Kirby\Http\Response('{"received":true,"duplicate":true}', 'application/json', 200);
                    }
                }

                // Items: metadata.products JSON (cart & single share the
                // format); metadata.product kept as legacy fallback.
                $metaItems = json_decode($s['metadata']['products'] ?? '', true);
                if (!$metaItems && !empty($s['metadata']['product'])) {
                    $metaItems = [['slug' => $s['metadata']['product'], 'qty' => 1]];
                }
                $metaItems = $metaItems ?: [];

                $lines = [];
                $firstTitle = '';
                foreach ($metaItems as $it) {
                    $p = page('shop/' . ($it['slug'] ?? ''));
                    $title = $p ? (string) $p->title() : ($it['slug'] ?? '?');
                    $firstTitle = $firstTitle ?: $title;
                    $lines[] = $title . ' × ' . (int) ($it['qty'] ?? 1);
                }
                $titleSuffix = count($metaItems) > 1 ? ' +' . (count($metaItems) - 1) : '';

                $cust    = $s['customer_details'] ?? [];
                $shipTo  = $s['shipping_details'] ?? [];
                $addr    = $shipTo['address'] ?? [];
                $address = trim(implode(', ', array_filter([
                    $addr['line1'] ?? null, $addr['line2'] ?? null, $addr['city'] ?? null,
                    $addr['state'] ?? null, $addr['postal_code'] ?? null, $addr['country'] ?? null,
                ])));

                $orderNo = 'ord-' . date('Ymd-His') . '-' . substr(md5($sid), 0, 6);
                $order = $orders->createChild([
                    'slug'     => $orderNo,
                    'template' => 'order',
                    'content'  => [
                        'title'         => 'Order — ' . $firstTitle . $titleSuffix . ' — ' . date('d.m.Y H:i'),
                        'orderDate'     => date('Y-m-d H:i'),
                        'products'      => implode("\n", $lines),
                        'amount'        => number_format(($s['amount_total'] ?? 0) / 100, 2, '.', '') . ' ' . strtoupper($s['currency'] ?? ''),
                        'customerEmail' => $cust['email'] ?? '',
                        'customerName'  => $cust['name'] ?? ($shipTo['name'] ?? ''),
                        'shippingAddress' => $address,
                        'sessionId'     => $sid,
                        'orderStatus'   => 'paid',
                    ],
                ]);
                try { $order = $order->changeStatus('unlisted'); } catch (Throwable $e) {
                    rb_shop_log('webhook: order stays draft (' . $e->getMessage() . ')');
                }

                // Inventory per item: decrement tracked quantity by the
                // ordered qty, flip to soldout at 0.
                foreach ($metaItems as $it) {
                    $p = page('shop/' . ($it['slug'] ?? ''));
                    if ($p && $p->quantity()->isNotEmpty()) {
                        $q = max(0, $p->quantity()->toInt() - max(1, (int) ($it['qty'] ?? 1)));
                        $update = ['quantity' => $q];
                        if ($q === 0) $update['stock'] = 'soldout';
                        $p->update($update, $defaultLang);
                    }
                }

                // Notify by email — works once SMTP is configured, until
                // then it just logs. The order page is already saved.
                try {
                    kirby()->email([
                        'from'    => option('site.contactFrom', 'noreply@redobureau.com'),
                        'to'      => option('site.contactTo', 'hello@redobureau.com'),
                        'subject' => '🛍 Paid order ' . $orderNo,
                        'body'    => "Items:\n" . implode("\n", $lines)
                                   . "\nAmount: " . $order->amount()
                                   . "\nCustomer: " . ($cust['name'] ?? '') . ' <' . ($cust['email'] ?? '') . '>'
                                   . "\nShip to: " . $address
                                   . "\nStripe session: " . $sid,
                    ]);
                } catch (Throwable $e) {
                    rb_shop_log('webhook: email skipped (' . $e->getMessage() . ')');
                }

                return new Kirby\Http\Response('{"received":true}', 'application/json', 200);
            },
        ],

        // ── Orders are panel-only: any front-end URL is a 404 ───────
        [
            'pattern' => 'orders',
            'action'  => fn() => new Kirby\Http\Response(site()->errorPage()->render(), 'text/html', 404),
        ],
        [
            'pattern' => 'orders/(:all)',
            'action'  => fn() => new Kirby\Http\Response(site()->errorPage()->render(), 'text/html', 404),
        ],

    ],

]);

// ── helpers ──────────────────────────────────────────────────────────

// Stripe success_url: the order-status page with the session id — the
// page looks the order up (webhook may lag a few seconds) and shows the
// number + tracking form. {CHECKOUT_SESSION_ID} is expanded by Stripe.
function rb_shop_status_url(string $fallback): string
{
    $p = page('shop/order-status');
    return ($p ? $p->url() : $fallback) . '?sid={CHECKOUT_SESSION_ID}';
}

function rb_shop_stripe_post(string $url, array $fields, string $secret): array
{
    $ch = curl_init($url);
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
    return [$code, $res];
}

// Stripe webhook signature: header "t=<ts>,v1=<hmac>[,v1=…]",
// signed_payload = "<ts>.<raw body>", HMAC-SHA256 with the whsec key.
function rb_shop_verify_signature(string $payload, string $header, string $secret): bool
{
    $ts = null; $sigs = [];
    foreach (explode(',', $header) as $part) {
        [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($k === 't')  $ts = $v;
        if ($k === 'v1') $sigs[] = $v;
    }
    if (!$ts || !$sigs) return false;
    if (abs(time() - (int) $ts) > 600) return false; // 10-min replay window

    $expected = hash_hmac('sha256', $ts . '.' . $payload, $secret);
    foreach ($sigs as $sig) {
        if (hash_equals($expected, $sig)) return true;
    }
    return false;
}

function rb_shop_log(string $line): void
{
    $dir = kirby()->root('site') . '/logs';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    @file_put_contents($dir . '/stripe.log', '[' . date('c') . '] ' . $line . "\n", FILE_APPEND);
}
