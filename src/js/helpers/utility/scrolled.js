import trigger from './trigger'

var scrolled = function () {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/scrolled

  var lastScrollPos = 0
  var prevScrollPos = -1
  var ticking = false

  trigger(window, 'scrolled', {
    last: lastScrollPos,
    prev: prevScrollPos
  })

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        lastScrollPos = window.pageYOffset

        trigger(window, 'scrolled', {
          last: lastScrollPos,
          prev: prevScrollPos
        })

        prevScrollPos = lastScrollPos
        ticking = false
      })
    }
    ticking = true
  }, { passive: true })
}

export default scrolled
