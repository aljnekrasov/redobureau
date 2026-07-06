<?php snippet('header', [
    'noindex' => true,
    'pageCss' => ['assets/css/shop.css'],
]) ?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<div class="main pt-75 md:pt-100">
    <div class="page">
        <div class="container">
            <div class="mb-25 extra"><?= $page->title() ?></div>
            <div class="row">
                <div class="col-12 md:col-8"
                     data-cart-root
                     data-shop-url="<?= url(page('shop')->url()) ?>"
                     data-checkout-url="<?= url('/shop/checkout-cart') ?>"
                     data-i18n='<?= json_encode([
                        'empty'    => t('cart_empty'),
                        'toShop'   => t('cart_to_shop'),
                        'remove'   => t('cart_remove'),
                        'subtotal' => t('cart_subtotal'),
                        'checkout' => t('cart_checkout'),
                        'mixed'    => t('cart_mixed'),
                     ], JSON_UNESCAPED_UNICODE | JSON_HEX_APOS) ?>'>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="<?= assetVersioned('assets/js/cart.js') ?>" defer></script>
<?php snippet('footer') ?>
