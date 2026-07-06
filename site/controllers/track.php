<?php
// Order-status lookup. Two modes:
//   ?sid=cs_…             — arriving from Stripe checkout (session id is
//                           an opaque secret from the redirect, no email
//                           needed). Webhook may lag: found=false + sid
//                           makes the template show a retry screen.
//   POST order + email    — manual lookup; the order number alone is not
//                           enough, the email must match (case-insensitive).

return function ($page, $site, $kirby) {
    $order = null;
    $tried = false;
    $sid   = get('sid');

    $orders = page('orders');
    $all = $orders ? $orders->childrenAndDrafts() : new Pages([]);

    if ($sid) {
        $tried = true;
        foreach ($all as $o) {
            if ($o->sessionId()->value() === $sid) { $order = $o; break; }
        }
    } elseif ($kirby->request()->is('POST')) {
        $tried = true;
        $no    = trim((string) get('order'));
        $email = mb_strtolower(trim((string) get('email')));
        if ($no !== '' && $email !== '') {
            foreach ($all as $o) {
                if ($o->slug() === $no
                    && mb_strtolower($o->customerEmail()->value() ?? '') === $email) {
                    $order = $o; break;
                }
            }
        }
    }

    return compact('order', 'tried', 'sid');
};
