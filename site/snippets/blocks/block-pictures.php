<div class="mb-10 mb-md-20 full-width-container">
  <?php if ($data->pictures()->toFiles()->count() == 1): ?>
    <div class="container">
      <div data-img-wrapper style="padding-bottom: <?= generatePadding($data->pictures()->toFiles()->first()) ?>;">
        <img src="<?= $data->pictures()->toFiles()->first()->resize(1920)->url() ?>" >
      </div>
    </div>
  <?php elseif ($data->pictures()->toFiles()->count() == 2): ?>
    <div class="container">
      <div class="row">
        <?php foreach ($data->pictures()->toFiles() as $picture): ?>
          <div class="col-12 col-md-6 mb-20 mb-md-0">
            <div data-img-wrapper style="padding-bottom: <?= generatePadding($picture) ?>;">
              <img src="<?= $picture->resize(1000)->url() ?>" >
            </div>
          </div>
        <?php endforeach ?>
      </div>
    </div>
  <?php elseif ($data->pictures()->toFiles()->count() >= 3): ?>
    <div class="slideshow" data-behavior="slideshow">
      <?php foreach ($data->pictures()->toFiles() as $picture): ?>
        <div class="slide">
          <img src="<?= $picture->resize(640)->url() ?>">
        </div>
      <?php endforeach ?>
    </div>
  <?php endif ?>
</div>