<?php
// Orders are panel-only. The site's error template (error.php) is a
// deliberate `go('/')` — every 404 on this site redirects home — so the
// cleanest guard is the same explicit redirect. No order data is ever
// rendered for any language prefix.
go('/');
