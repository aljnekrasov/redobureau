<?php

// Guard direct access to a project page that isn't meant for this host.
// Returns 404 + the standard error template before the project template runs.

return function ($page, $site, $kirby) {
  if (!$page->audienceAllows()) {
    // http_response_code, not $kirby->response()->code(): echo+exit
    // bypasses Kirby's response pipeline and its code is never emitted.
    http_response_code(404);
    echo $site->errorPage()->render();
    exit;
  }
  return [];
};
