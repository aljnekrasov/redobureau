<?php
return function ($kirby, $site) {
  if ($kirby->request()->is('POST')) {
    $message = get('message');
    $tel = get('tel');
    $email = get('email');
    $isEn = $kirby->language()->code() == 'en';

    if (!$tel && !$email) {
      echo json_encode([
        'ok' => 0,
        'msg' => $isEn ? 'Please write a phone number or e-mail' : 'Напишите вашу почту или телефон'
      ]);
      exit;
    }

    if (!$message) {
      echo json_encode([
        'ok' => 0,
        'msg' => $isEn ? 'Please write a message' : 'Напишите сообщение'
      ]);
      exit;
    }

    try {
      $kirby->email([
        'from' => 'anton@redobureau.com',
        'to' => 'marina@redobureau.com',
        'subject' => '📬 New message from Redo website',
        'template' => 'info',
        'data' => [
          'message' => $message,
          'tel' => $tel,
          'email' => $email
        ]
      ]);
    } catch (Exception $error) {
      echo json_encode([
        'ok' => 0,
        // 'msg' => $error->getMessage()
        'msg' => $isEn ? 'There was an error' : 'Ошибка!'
      ]);
      exit;
    }

    echo json_encode([
      'ok' => 1,
      'msg' => $isEn ? 'Thank you, we will not tell anyone!' : 'Сообщение отправлено!'
    ]);

    exit;
  }
};