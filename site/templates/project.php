<?php snippet('header') ?>

<div class="hero" data-target="heroContainer">
  <div data-behavior="hero">
    <?php
    $cover = $page->files()->template('heroCover')->first();

    if ($cover && $cover->type() == 'video') : ?>
      <video src="<?= $cover->url() ?>" preload="auto" autoplay loop muted playsinline>
      <?php elseif ($cover) : ?>
        <img src="<?= $cover->url() ?>">
      <?php endif ?>
  </div>
</div>

<div class="main pt-20 md:pt-50" data-headerBg-main>
  <div class="page">
    <div class="container">
      <div class="mb-25 extra"><?= $page->title() ?></div>

      <div class="row mb-50">
        <div class="col-12 sm:col-6 mb-25 md:mb-0">
          <?= $page->desc()->kt() ?>
          <?php if ($page->link()->isNotEmpty()) : ?>
            <a class="mt-10 block" href="<?= $page->link() ?>"><?= t('visit_website') ?>
              <span class="main__icon">
                <?= svg('assets/icons/arrow.svg') ?>
              </span></a>
          <?php endif ?>
        </div>
        <div class="col sm:col-2 sm:offset-1">
          <div class=""><?= t('subject') ?></div>
          <?php foreach ($page->industry()->split() as $value) : ?>
            <div class="fg-muted"><?= $value ?></div>
          <?php endforeach ?>

          <div class=" mt-25"><?= t('work_type') ?></div>
          <?php foreach ($page->types()->split() as $value) : ?>
            <div class="fg-muted"><?= $value ?></div>
          <?php endforeach ?>
        </div>
        <div class="col sm:col-3 md:col-2">
          <div class=""><?= t('team') ?></div>
          <?php foreach ($page->team()->split() as $value) : ?>
            <div class="fg-muted"><?= $value ?></div>
          <?php endforeach ?>
        </div>

      </div>

      <?php foreach ($page->builder()->toBuilderBlocks() as $block) : ?>
        <?php snippet('blocks/' . $block->_key(), array('data' => $block)) ?>
      <?php endforeach ?>
    </div>


  </div>

  <!-- NEXT PROJECT -->
  <?php if ($next = $page->next()) : ?>
    <a href="<?= url($next->url()) ?>" class="block next-project">
      <div class="py-50">
        <div class="container">
          <div class="row">
            <div class="col-12">
              <div class="mb-15 text-extra">
                <?= $next->title() ?>
              </div>
              <div class="text-small fg-muted"><?= t('next_project') ?></div>
            </div>
          </div>
        </div>
      </div>
    </a>
  <?php endif ?>
  <!-- END NEXT PROJECT -->
</div>



<?php snippet('footer') ?>