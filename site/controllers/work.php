<?php
return function($page, $site) {
  $published = $page->children()->published();
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