
<?= js([
    'assets/js/balancetext.min.js',
    'assets/js/index.min.js',
    'assets/js/swiper.min.js',
    ] ) ?>

<?= js([
    'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver%2CIntersectionObserverEntry%2CMutationObserver%2Cperformance.now'
], ['async' => true]) ?>
