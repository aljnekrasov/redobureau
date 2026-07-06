<?php
// Orders are panel-only. Any front-end render (any language prefix) is a
// hard 404. http_response_code() — not $kirby->response()->code() — is
// required here: echo+exit bypasses Kirby's response pipeline, so the
// status set on the Kirby response object would never be emitted.
http_response_code(404);
echo $site->errorPage()->render();
exit;
