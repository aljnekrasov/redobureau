<?php

// IP alias for the redobureau.com server — same trick as the .ru one:
// browsing by bare IP loads the international config instead of the
// base fallback.
return include __DIR__ . '/config.redobureau.com.php';
