<div class="row mb-50">
  <div class="col-12 sm:col-8">
    <blockquote class="story-quote">
      <?= $data->text()->kt() ?>
      <?php if ($data->cite()->isNotEmpty()) : ?>
      <footer class="fg-muted mt-10"><?= $data->cite() ?></footer>
      <?php endif ?>
    </blockquote>
  </div>
</div>
