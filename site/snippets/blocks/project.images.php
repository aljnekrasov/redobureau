<?php $media = $data->pictures()->toFiles(); ?>

<div class="mb-10 md:mb-20">
  <?php if ($media->count() == 1) : ?>
    <?php if ($media->first()->type() == 'video') : ?>
      <?php if ($data->auto_height()->isTrue()) : ?>
        <?php snippet('partials/video_ah', ['src' => $media->first()->url()]) ?>
      <?php else : ?>
        <?php snippet('partials/video', ['src' => $media->first()->url()]) ?>
      <?php endif ?>

    <?php else : ?>
      <?php snippet('partials/picture', ['file' => $media->first()]) ?>
    <?php endif ?>
  <?php elseif ($media->count() == 2) : ?>
    <div class="row">
      <?php foreach ($media as $file) : ?>
        <div class="col-12 md:col-6 mb-20 md:mb-0">
          <?php if ($file->type() == 'video') : ?>
            <?php if ($data->auto_height()->isTrue()) : ?>
              <?php snippet('partials/video_ah', ['src' => $file->url()]) ?>
            <?php else : ?>
              <?php snippet('partials/video', ['src' => $file->url()]) ?>
            <?php endif ?>
          <?php else : ?>
            <?php snippet('partials/picture', ['file' => $file]) ?>
          <?php endif ?>
        </div>
      <?php endforeach ?>
    </div>
  <?php elseif ($media->count() >= 3) : ?>
    <div class="full-width-container">
      <div class="swiper-container" data-behavior="slideshow">
        <div class="swiper-wrapper">
          <?php foreach ($media as $file) : ?>
            <div class="swiper-slide">
              <img src="<?= $file->resize(1920)->url() ?>">
              <? //php snippet('partials/picture', [ 'file' => $file ])
              ?>
            </div>
          <?php endforeach ?>
        </div>
      </div>
    </div>
  <?php endif ?>
</div>