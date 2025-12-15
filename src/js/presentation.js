/* eslint no-unused-vars: off */
/* globals TweenMax */
import { lazyLoad } from './helpers'

(function (d) {
  var _html = window._html = d.documentElement
  var isTouch = window.isTouch = (('ontouchstart' in window) || (window.documentTouch && d instanceof window.DocumentTouch)) ? 1 : 0

  // Remove 300ms delay on Tap
  // Add helpers class && :active on touch devices
  // ----------------------------------------------------------------------------
  _html.classList.add(isTouch ? 'touch' : 'no-touch')
  isTouch && window.addEventListener('touchstart', () => {}, true)

  document.addEventListener('DOMContentLoaded', function () {
    lazyLoad()

    new window.Swiper('#presentation', {
      pagination: {
        el: '.present-slider-pagination',
        type: 'fraction'
      },
      keyboard: {
        enabled: true,
        onlyInViewport: false
      }
    })
  })
})(document)
