<?php
snippet('header');

$teamList = $site->team()->toStructure();

?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<div class="main pt-75 md:pt-100">
    <div class="page">
        <div class="container">
            <div class="row mb-100">
                <div class="col-12 sm:col-6 md:col-5 mb-15 sm:mb-0">
                    <?= $page->text()->kt() ?>
                </div>
                <div class="col-12 sm:col-5 md:col-4 sm:offset-1">
                    <div class="">
                        <?//= t('friends') ?>
                        <div class="row">
                            <?php foreach ($page->friends()->toStructure() as $item) : ?>
                            <div class="col-12">
                                <?php if ($item->url()->isNotEmpty()) : ?>
                                <a class="fg-muted" href="<?= $item->url() ?>" target="_blank"
                                    rel="noopener"><?= $item->name() ?></a>
                                <?php else : ?>
                                <span class="fg-muted"><?= $item->name() ?></span>
                                <?php endif ?>
                            </div>
                            <?php endforeach ?>
                        </div>
                    </div>
                </div>
            </div>

            <?php if ($page->clients()->isNotEmpty()) : ?>
            <div class="row mb-100">
                <div class="col-12 sm:col-2"><div class="fg-muted"><?= t('clients_label') ?></div></div>
                <div class="col-12 sm:col-9">
                    <?php $__cl = []; foreach ($page->clients()->toStructure() as $c) $__cl[] = (string) $c->name(); ?>
                    <?= implode(' · ', $__cl) ?>
                </div>
            </div>
            <?php endif ?>

            <div class="row mb-100">
                <?php foreach (Str::split($page->team()) as $i) : ?>
                <?php foreach ($teamList as $j) : ?>
                <?php if ($j->name() == $i) : ?>
                <div class="col-12 sm:-6 md:col-4 mb-25 relative">
                    <div data-img-wrapper style="padding-bottom: 100%;">
                        <?php if ($image = $j->pic()->toFile()) : ?>
                        <img src="<?= $image->crop(500, 500)->url() ?>"
                            alt="<?= $j->name() . '/' . $j->spec() ?>">
                        <?php endif ?>
                    </div>
                    <div class="mt-10"><?= $j->name() ?></div>
                    <div class="fg-muted truncate"><?= $j->spec() ?></div>
                    <?php if ($j->link()->isNotEmpty()) : ?>
                    <a href="<?= $j->link() ?>" target="_blank" rel="noopener" class="absolute pin"></a>
                    <?php endif ?>
                </div>
                <?php endif ?>
                <?php endforeach ?>
                <?php endforeach ?>
            </div>

            <div class="row">
                <div class="col md:col-8">
                    <div class="row">
                        <?php foreach ($page->directions()->toStructure() as $key => $value) : ?>
                        <div class="col-12 sm:col-6 mb-50">
                            <div class="mb-10"><?= $value->title() ?></div>
                            <div><?= $value->text()->kt() ?></div>
                        </div>
                        <?php endforeach ?>
                    </div>
                </div>
            </div>

            <?php if ($site->clients()->isNotEmpty()) : ?>
            <div class="clients">
                <div class="clients-track" data-behavior="marquee">
                    <div class="clients-body">
                        <?php foreach ($site->clients()->toStructure() as $client) : ?>
                        <?php if ($pic = $client->pic()->toFile()) : ?>
                        <div class="clients-col">
                            <img src="<?= $pic->url() ?>" alt="<?= $client->name() ?>">
                        </div>
                        <?php endif ?>
                        <?php endforeach ?>
                    </div>
                </div>
            </div>
            <?php endif ?>
        </div>
    </div>
</div>
<?php snippet('footer') ?>