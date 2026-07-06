<?php
// Orders are panel-only. Any front-end render (any language prefix)
// is a 404 — the route-level guards in plugins/shop cover the bare
// paths, this covers /en/orders, /ru/orders/…, etc.
$kirby->response()->code(404);
echo $site->errorPage()->render();
