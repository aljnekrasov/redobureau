<?php
return function($page, $site) {
  // Restrict to projects allowed for the current host's audience first,
  // so any downstream filter / count operates on the visible set only.
  $published = $page->children()->published()->filter(fn($p) => $p->audienceAllows());
  $projects = $published;
  $type = 'Type';
  $industry = 'Industry';

  if($q = get('q')) {
    foreach ($site->worktypes()->toStructure() as $item) {
      if ($item->name() == $q) {
        $type = $q;
      }
    }

    foreach ($site->industries()->toStructure() as $item) {
      if ($item->name() == $q) {
        $industry = $q;
      }
    }

    $projects = $published->filter(function ($page) {
      $q = get('q');
      $res = [];

      if (in_array($q, $page->types()->split()) or in_array($q, $page->industry()->split())) {
        $res[] = $page;
      }

      return $res;
    });
  }


  return compact('projects', 'type', 'industry');
};