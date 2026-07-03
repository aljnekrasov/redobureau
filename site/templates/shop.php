<?php snippet('header', ['noindex' => !option('site.navShop', false)]) ?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<div class="main pt-75 md:pt-100">
    <div class="page">
        <div class="container">
            <div class="row">
                <?php foreach ($page->children()->listed()->filter(fn($p) => $p->audienceAllows()) as $product) : ?>
                <div class="col-12 sm:col-6 md:col-4 mb-40">
                    <a href="<?= url($product->url()) ?>" class="block link">
                        <?php if ($pc = $product->files()->template('previewCover')->first()) : ?>
                        <div class="home-cover-image">
                            <img src="<?= $pc->resize(1000)->url() ?>"
                                 srcset="<?= $pc->resize(600)->url() ?> 600w, <?= $pc->resize(1000)->url() ?> 1000w"
                                 sizes="(min-width: 768px) 33vw, 100vw"
                                 alt="<?= $product->title() ?>" loading="lazy">
                        </div>
                        <?php endif ?>
                        <div class="mt-10"><?= $product->title() ?></div>
                        <div class="fg-muted">
                            <?php if ($product->stock()->value() === 'soldout') : ?>
                            <?= t('shop_soldout') ?>
                            <?php else : ?>
                            <?= $product->displayPrice() ?>
                            <?php endif ?>
                        </div>
                    </a>
                </div>
                <?php endforeach ?>
            </div>
        </div>
    </div>
</div>

<?php snippet('footer') ?>
