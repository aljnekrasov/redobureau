<?php

// IP alias for the redobureau.ru server. Kirby also loads
// config.<SERVER_ADDR>.php, so browsing the server by bare IP (before DNS
// points redobureau.ru here, or for previews) behaves exactly like the
// real Russian site instead of falling back to the base config (which
// would show the English default).
return include __DIR__ . '/config.redobureau.ru.php';
