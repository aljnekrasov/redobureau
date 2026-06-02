<?php
return function ($kirby, $site) {
  if ($kirby->request()->is('POST')) {
    $message = get('message');
    $tel     = get('tel');
    $email   = get('email');

    if (!$tel && !$email) {
      echo json_encode(['ok' => 0, 'msg' => t('form_no_contact')]);
      exit;
    }

    if (!$message) {
      echo json_encode(['ok' => 0, 'msg' => t('form_no_message')]);
      exit;
    }

    // SMTP credentials and from/to addresses come from per-host config
    // (site/config/config.redobureau.com.php / .ru.php). Without them,
    // $kirby->email() throws and we fall back to the localized error.
    try {
      $kirby->email([
        'from'     => option('site.contactFrom', 'noreply@redobureau.com'),
        'to'       => option('site.contactTo',   'marina@redobureau.com'),
        'subject'  => '📬 New message from Redo website',
        'template' => 'info',
        'data'     => [
          'message' => $message,
          'tel'     => $tel,
          'email'   => $email,
        ],
      ]);
    } catch (Exception $error) {
      echo json_encode(['ok' => 0, 'msg' => t('form_error')]);
      exit;
    }

    echo json_encode(['ok' => 1, 'msg' => t('form_sent')]);
    exit;
  }
};