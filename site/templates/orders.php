<?php
// Orders are panel-only. Any front-end render (any language prefix)
// is a hard 404 — exit() is required, otherwise Kirby finishes its
// render pipeline and overwrites the status code with 200.
$kirby->response()->code(404);
echo $site->errorPage()->render();
exit;
