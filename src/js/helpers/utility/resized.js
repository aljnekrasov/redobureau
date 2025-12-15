import getCurrentMediaQuery from './getCurrentMediaQuery'
import trigger from './trigger'

var resized = function () {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/resized

  var mediaQuery = getCurrentMediaQuery()
  var ticking = false

  window.currentMediaQuery = mediaQuery

  trigger(window, 'mediaQueryUpdated')
  trigger(window, 'resized')

  window.addEventListener('resize', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        var newMediaQuery = getCurrentMediaQuery()

        trigger(window, 'resized')

        if (newMediaQuery !== mediaQuery) {
          mediaQuery = newMediaQuery

          window.currentMediaQuery = newMediaQuery

          trigger(window, 'mediaQueryUpdated')
        }

        ticking = false
      })
    }
    ticking = true
  })
}

export default resized
