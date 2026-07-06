<?php $files = $data->pictures()->toFiles(); ?>
<?php if ($files->count() == 1) : $f = $files->first(); ?>
<figure class="j-media">
  <div data-img-wrapper style="padding-bottom: <?= generatePadding($f) ?>;">
    <img src="<?= $f->resize(1920)->url() ?>" alt="" loading="lazy">
  </div>
</figure>
<?php elseif ($files->count() >= 2) : ?>
<figure class="j-media j-media-2">
  <?php foreach ($files as $f) : ?>
  <div data-img-wrapper style="padding-bottom: <?= generatePadding($f) ?>;">
    <img src="<?= $f->resize(1000)->url() ?>" alt="" loading="lazy">
  </div>
  <?php endforeach ?>
</figure>
<?php endif ?>
