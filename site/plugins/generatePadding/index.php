<?php
function generatePadding($img)
{
  $h = $img->height();
  $w = $img->width();
  $padding = $h / $w;

  return str_replace(',', '.', $padding * 100) . '%';
}