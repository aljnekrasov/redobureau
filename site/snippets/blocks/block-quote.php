<blockquote class="j-quote">
  <?= $data->text()->kt() ?>
  <?php if ($data->cite()->isNotEmpty()) : ?>
  <footer><?= $data->cite() ?></footer>
  <?php endif ?>
</blockquote>
