<?php snippet('header') ?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<div class="main pt-75 md:pt-100">
    <div class="page">
        <div class="container">
            <div class="row mb-50">
                <div class="col-12 sm:col-8">
                    <div class="mb-25 extra"><?= $page->title() ?></div>
                    <?= $page->intro()->kt() ?>
                </div>
            </div>

            <div class="tools-list">
                <?php foreach ($page->items()->toStructure() as $tool) : ?>
                <a class="tool-row" href="<?= url($tool->url()) ?>">
                    <div class="tool-name"><?= $tool->name() ?>
                        <?php if ($tool->tag()->isNotEmpty()) : ?><span class="tool-tag"><?= $tool->tag() ?></span><?php endif ?>
                    </div>
                    <?php if ($tool->desc()->isNotEmpty()) : ?>
                    <div class="tool-desc fg-muted"><?= $tool->desc() ?></div>
                    <?php endif ?>
                    <span class="tool-go">→</span>
                </a>
                <?php endforeach ?>
            </div>
        </div>
    </div>
</div>

<?php snippet('footer') ?>
