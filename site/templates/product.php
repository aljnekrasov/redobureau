<?php snippet('header', [
    'noindex' => !option('site.navShop', false),
    'pageCss' => ['assets/css/shop.css'],
]) ?>

<?php
$isRu     = $site->currentAudience() === 'ru';
$soldout  = $page->isSoldOut();
$preorder = $page->stock()->value() === 'preorder';
// Stripe only works internationally; .ru falls back to mail-order until
// a Russian PSP (ЮKassa) lands in V2. Same fallback when no key is set.
$stripeOk = !$isRu && option('site.stripeSecret');
$mailto   = 'mailto:' . $site->contactEmail()
          . '?subject=' . rawurlencode('Order: ' . $page->title() . ' — ' . ($page->displayPrice() ?? ''));
?>

<div class="main pt-75 md:pt-100">
    <div class="page">
        <div class="container">
            <div class="row mb-50">
                <div class="col-12 sm:col-5">
                    <h1 class="mb-15 extra seo-h"><?= $page->title() ?></h1>
                    <?php if ($price = $page->displayPrice()) : ?>
                    <div class="mb-25 shop-price"><?= $price ?><?php if ($preorder) : ?> · <span class="fg-muted"><?= t('shop_preorder') ?></span><?php endif ?></div>
                    <?php endif ?>

                    <?= $page->desc()->kt() ?>

                    <?php
                    $specs = array_filter([
                        t('spec_materials')  => $page->materials()->value(),
                        t('spec_dimensions') => $page->dimensions()->value(),
                        t('spec_edition')    => $page->edition()->value(),
                        t('spec_ships_in')   => $page->ships_in()->value(),
                    ]);
                    ?>
                    <?php if ($specs) : ?>
                    <dl class="p-specs">
                        <?php foreach ($specs as $k => $v) : ?>
                        <div><dt><?= $k ?></dt><dd><?= html($v) ?></dd></div>
                        <?php endforeach ?>
                    </dl>
                    <?php endif ?>

                    <div class="p-actions">
                        <?php if ($soldout) : ?>
                        <button class="rb-btn rb-btn--primary" disabled><?= t('shop_soldout') ?></button>
                        <?php elseif ($stripeOk || (!$isRu && !option('site.stripeSecret'))) : ?>
                            <?php if ($stripeOk) : ?>
                            <form action="<?= url('/shop/checkout') ?>" method="POST" data-checkout="<?= $page->slug() ?>">
                                <input type="hidden" name="product" value="<?= $page->slug() ?>">
                                <button class="rb-btn rb-btn--primary" type="submit"><?= $preorder ? t('shop_preorder') : t('shop_buy') ?></button>
                            </form>
                            <?php else : ?>
                            <a class="rb-btn rb-btn--primary" href="<?= $mailto ?>"><?= t('shop_order_mail') ?></a>
                            <?php endif ?>
                            <button class="rb-btn rb-btn--secondary"
                                data-cart-add
                                data-slug="<?= $page->slug() ?>"
                                data-title="<?= html($page->title()) ?>"
                                data-price="<?= $page->price()->toFloat() ?>"
                                data-currency="<?= strtolower($page->currency()->or('usd')->value()) ?>"
                                data-img="<?= ($pcov = $page->files()->template('previewCover')->first()) ? $pcov->resize(200)->url() : '' ?>"
                                data-label="<?= t('cart_add') ?>"
                                data-added="<?= t('cart_added') ?>"><?= t('cart_add') ?></button>
                        <?php else : ?>
                        <a class="rb-btn rb-btn--primary" href="<?= $mailto ?>"><?= t('shop_order_mail') ?></a>
                        <?php endif ?>
                    </div>

                    <div class="mt-15 fg-muted" data-shop-note hidden></div>
                </div>

                <div class="col-12 sm:col-6 sm:offset-1 mt-40 sm:mt-0">
                    <?php foreach ($page->files()->template('previewCover')->add($page->gallery()->toFiles()) as $file) : ?>
                        <?php if ($file->type() == 'image') : ?>
                        <div class="mb-20" data-img-wrapper style="padding-bottom: <?= generatePadding($file) ?>;">
                            <img src="<?= $file->resize(1200)->url() ?>"
                                 srcset="<?= $file->resize(800)->url() ?> 800w, <?= $file->resize(1200)->url() ?> 1200w, <?= $file->resize(2000)->url() ?> 2000w"
                                 sizes="(min-width: 640px) 50vw, 100vw"
                                 alt="<?= $page->title() ?>" loading="lazy">
                        </div>
                        <?php endif ?>
                    <?php endforeach ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Post-checkout feedback (?paid=1 / ?checkout=...) — rendered client-side
// so the page stays cache-friendly. Also fires the retargeting event.
(function () {
    var note = document.querySelector('[data-shop-note]');
    var q = location.search;
    if (!note || !q) return;
    var msg = null;
    if (/[?&]paid=1/.test(q)) msg = <?= json_encode(t('shop_paid')) ?>;
    else if (/[?&]checkout=(error|unavailable)/.test(q)) msg = <?= json_encode(t('shop_checkout_error')) ?>;
    else if (/[?&]checkout=soldout/.test(q)) msg = <?= json_encode(t('shop_soldout')) ?>;
    if (msg) { note.textContent = msg; note.hidden = false; }
    if (/[?&]paid=1/.test(q) && window.rbTrack) rbTrack('purchase', { product: <?= json_encode($page->slug()) ?> });
})();
document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('form[data-checkout]');
    if (f && window.rbTrack) rbTrack('begin_checkout', { product: f.dataset.checkout });
});
</script>

<?php if (!$isRu && ($cartPage = page('shop/cart'))) : ?>
<a class="cart-badge" href="<?= url($cartPage->url()) ?>" data-cart-badge hidden><?= t('cart') ?> <b>0</b></a>
<script src="<?= assetVersioned('assets/js/cart.js') ?>" defer></script>
<?php endif ?>

<?php snippet('footer') ?>
