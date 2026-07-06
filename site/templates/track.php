<?php snippet('header', [
    'noindex' => true,
    'pageCss' => ['assets/css/shop.css'],
]) ?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<div class="main pt-75 md:pt-100" data-order-status>
    <div class="page">
        <div class="container">
            <div class="mb-25 extra"><?= $page->title() ?></div>

            <?php if ($order) : ?>
            <?php $st = $order->orderStatus()->or('paid')->value(); ?>
            <div class="order-card">
                <div class="no"><?= t('track_order_no') ?></div>
                <h2><?= $order->slug() ?></h2>

                <div class="order-items">
                    <?php foreach (preg_split('/\n+/', trim($order->products()->value() ?? '')) as $line) : if (!$line) continue; ?>
                    <div><span><?= html($line) ?></span></div>
                    <?php endforeach ?>
                    <div><span><?= t('cart_subtotal') ?></span><span><?= $order->amount() ?></span></div>
                </div>

                <?php if ($st === 'refunded') : ?>
                <div class="order-miss"><?= t('track_refunded') ?></div>
                <?php else : ?>
                <div class="timeline">
                    <?php
                    $steps = ['paid' => t('track_paid'), 'shipped' => t('track_shipped'), 'done' => t('track_done')];
                    $reached = true;
                    foreach ($steps as $key => $label) :
                    ?>
                    <div class="step <?= $reached ? 'on' : '' ?>"><?= $label ?></div>
                    <?php if ($key === $st) $reached = false; endforeach ?>
                </div>
                <?php endif ?>

                <?php if ($order->tracking()->isNotEmpty()) : ?>
                <div class="track-link">
                    <?= t('track_number') ?>:
                    <?php if ($order->trackingUrl()->isNotEmpty()) : ?>
                    <a href="<?= $order->trackingUrl() ?>" rel="noopener" target="_blank"><?= $order->tracking() ?> ↗</a>
                    <?php else : ?>
                    <b><?= $order->tracking() ?></b>
                    <?php endif ?>
                </div>
                <?php endif ?>

                <div class="mt-15 fg-muted text-small"><?= t('track_keep_number') ?></div>
            </div>

            <?php elseif ($tried && $sid) : ?>
            <!-- Paid on Stripe, webhook still settling — retry shortly -->
            <div class="order-card">
                <div class="no"><?= t('track_processing') ?></div>
                <h2>…</h2>
                <div class="fg-muted"><?= t('track_processing_hint') ?></div>
            </div>
            <script>setTimeout(function () { location.reload(); }, 4000);</script>

            <?php else : ?>
            <?php if ($tried) : ?>
            <div class="order-miss mb-25"><?= t('track_not_found') ?></div>
            <?php endif ?>
            <form class="track-form" method="POST">
                <div>
                    <label for="t-order"><?= t('track_order_no') ?></label>
                    <input id="t-order" name="order" type="text" required placeholder="ord-20260706-…">
                </div>
                <div>
                    <label for="t-email"><?= t('track_email') ?></label>
                    <input id="t-email" name="email" type="email" required>
                </div>
                <button class="rb-btn rb-btn--primary" type="submit"><?= t('track_find') ?></button>
            </form>
            <?php endif ?>
        </div>
    </div>
</div>

<script src="<?= assetVersioned('assets/js/cart.js') ?>" defer></script>
<?php snippet('footer') ?>
