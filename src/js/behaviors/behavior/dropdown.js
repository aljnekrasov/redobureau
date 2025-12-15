import scrollLock from 'scroll-lock'
import { purgeProperties, wait, forEach } from './../../helpers'

var dropdown = function (el) {
  var bodies

  function _handleClicks (ev) {
    if (ev && ev.target.closest('[data-ref="dropdown.trigger"]')) {
      var trigger = ev.target.closest('[data-ref="dropdown.trigger"]')
      var target = document.getElementById(trigger.getAttribute('data-target-id'))

      forEach(bodies, function (_el) {
        _el.setAttribute('hidden', true)
      })

      el.classList.add('-fadein')

      if (target.getAttribute('hidden') !== null) {
        target.removeAttribute('hidden')
        scrollLock.disablePageScroll(target)
      } else {
        target.setAttribute('hidden', true)
        scrollLock.enablePageScroll(target)
      }
    }

    if (ev && ev.target.closest('[data-ref="dropdown.body"]')) {
      el.classList.add('-fadeout')

      wait(400).run(function () {
        forEach(bodies, function (_el) {
          el.classList.remove('-fadeout', '-fadein')
          _el.setAttribute('hidden', true)
          scrollLock.enablePageScroll(_el)
        })
      })
    }
  }

  function _init () {
    bodies = el.querySelectorAll('[data-ref="dropdown.body"]')
    el.addEventListener('click', _handleClicks)
  }

  this.destroy = function () {
    el.removeEventListener('click', _handleClicks)

    purgeProperties(this)
  }

  this.init = function () {
    _init()
  }
}

export default dropdown
