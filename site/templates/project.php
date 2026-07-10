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
      <h1 class="mb-25 extra seo-h"><?= $page->title() ?></h1>

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

      <?php if ($page->challenge()->isNotEmpty()) : ?>
      <div class="row case-block">
        <div class="col-12 sm:col-6">
          <div class="case-label"><?= t('case_challenge') ?></div>
          <?= $page->challenge()->kt() ?>
        </div>
      </div>
      <?php endif ?>

      <?php foreach ($page->builder()->toBuilderBlocks() as $block) : ?>
        <?php snippet('blocks/' . $block->_key(), array('data' => $block)) ?>
      <?php endforeach ?>

      <?php $metrics = $page->results()->toStructure(); ?>
      <?php if ($metrics->count() || $page->result_text()->isNotEmpty()) : ?>
      <div class="row case-block">
        <div class="col-12 sm:col-8">
          <div class="case-label"><?= t('case_result') ?></div>
          <?php if ($metrics->count()) : ?>
          <div class="case-metrics">
            <?php foreach ($metrics as $m) : ?>
            <div><b><?= $m->value() ?></b><span><?= $m->label() ?></span></div>
            <?php endforeach ?>
          </div>
          <?php endif ?>
          <?= $page->result_text()->kt() ?>
        </div>
      </div>
      <?php endif ?>

      <?php if ($page->testimonial()->isNotEmpty()) : ?>
      <blockquote class="case-quote">
        <?= $page->testimonial()->kt() ?>
        <?php if ($page->testimonial_author()->isNotEmpty()) : ?>
        <footer><?= $page->testimonial_author() ?></footer>
        <?php endif ?>
      </blockquote>
      <?php endif ?>
    </div>


  </div>

  <?php if ($site->currentAudience() !== 'ru') : ?>
  <a href="<?= url('/teardown/') ?>" class="block next-project">
    <div class="py-50">
      <div class="container">
        <div class="row">
          <div class="col-12">
            <div class="text-small fg-muted mb-15">Redo × your brand</div>
            <div><?= t('cta_teardown_long') ?></div>
          </div>
        </div>
      </div>
    </div>
  </a>
  <?php endif ?>

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