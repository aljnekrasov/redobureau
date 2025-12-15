<div data-img-wrapper style="padding-bottom: <?= generatePadding($file) ?>;">
  <picture>
    <source srcset="<?= $file->resize(2500)->url() ?>" media="(min-width: 900px)">
    <img src="<?= $file->resize(900)->url() ?>">
  </picture>
</div>