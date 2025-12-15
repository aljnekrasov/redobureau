<?php

return [
  'debug'  => true,
  'languages' => true,
  'languages' => ['detect' => true],
  'thumbs' => ['driver' => 'gd'],
  'email' => [
    'transport' => [
      'type' => 'smtp',
      'host' => 'smtp.gmail.com',
      'port' => 465,
      'security' => true,
      'auth' => true,
      "protocol" => 'ssl',
      'username' => 'anton@redobureau.com',
      'password' => 'FbdyP6%G',
    ]
  ]
];