  <div class="footer" data-behavior="footer">
      <div class="body">
          <div class="container">
              <div class="row">
                  <div class="col sm-col:4 md:col-3 links">
                      <a
                          href="<?= $pages->template('home')->first()->url() ?>"><?= $pages->template('work')->first()->title() ?></a>
                      <a
                          href="<?= $pages->template('studio')->first()->url() ?>"><?= $pages->template('studio')->first()->title() ?></a>
                      <a href="<?= $kirby->language()->url() . '' . '/contacts' ?>"><?= t('contacts') ?></a>
                  </div>

                  <div class="col sm-col:4 md:col-3 links">
                      <?php foreach ($site->socialLinks()->toStructure() as $link) : ?>
                      <a rel="noopener" href="<?= url($link->url()) ?>" target="_blank"><?= $link->name() ?></a>
                      <?php endforeach ?>
                  </div>

                  <div class="col-12 sm:col-3 md:col-3 sm:offset-3 self-end pb-5 lg:pb-10 pt-20 sm:pt-0">
                      <?php if ($policy = $site->files()->findBy('template', 'policy')) : ?>
                      <div><a href="<?= $policy ?>"><?= t('privacy') ?></a></div>
                      <?php endif ?>

                      <div class="mt-auto">
                          <?php if ($site->contactEmail()->isNotEmpty()) : ?>
                          <div>
                              <a href="mailto:<?= $site->contactEmail() ?>"><?= $site->contactEmail() ?></a>
                          </div>
                          <?php endif ?>
                          <?php if ($site->contactPhone()->isNotEmpty()) : ?>
                          <div>
                              <a
                                  href="tel:<?= Str::replace($site->contactPhone(), ' ', '') ?>"><?= $site->contactPhone() ?></a>
                          </div>
                          <?php endif ?>
                          <?php if ($site->contactAdressUrl()->isNotEmpty() && $site->contactAdress()->isNotEmpty()) : ?>
                          <?= t('visit') ?>
                          <a rel="noopener" class="truncate" href="<?= $site->contactAdressUrl() ?>"
                              target="_blank"><?= $site->contactAdress() ?> ↗︎</a>
                          <?php endif ?>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  </div>

  <?php snippet('tail') ?>
  </body>

  </html>