var zoom = function () {
  var OFFSET = 5
  var _body = document.body

  function offset (element) {
    var rect = element.getBoundingClientRect()
    var scrollTop = window.pageYOffset ||
      document.documentElement.scrollTop ||
      _body.scrollTop ||
      0
    var scrollLeft = window.pageXOffset ||
      document.documentElement.scrollLeft ||
      _body.scrollLeft ||
      0
    return {
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft
    }
  }

  ;(function () {
    var activeZoom = null
    var initialScrollPosition = null
    var initialTouchPosition = null

    // function listen () {
    _body.addEventListener('click', function (event) {
      if (event.target.getAttribute('data-action') !== 'zoom' ||
        event.target.tagName !== 'IMG') return

      zoom(event)
    })
    // }

    // listen()

    function zoom (event) {
      event.stopPropagation()

      if (_body.classList.contains('zoom-overlay-open')) return

      if (event.metaKey || event.ctrlKey) return openInNewWindow(event)

      closeActiveZoom({ forceDispose: true })

      activeZoom = vanillaZoom(event.target)
      activeZoom.zoomImage()

      addCloseActiveZoomListeners()
    }

    function openInNewWindow (event) {
      window.open(event.target.getAttribute('data-original') ||
        event.target.currentSrc ||
        event.target.src, '_blank')
    }

    function closeActiveZoom (options) {
      options = options || { forceDispose: false }
      if (!activeZoom) return

      activeZoom[options.forceDispose ? 'dispose' : 'close']()
      removeCloseActiveZoomListeners()
      activeZoom = null
    }

    function addCloseActiveZoomListeners () {
      // todo(fat): probably worth throttling this
      window.addEventListener('scroll', handleScroll)
      document.addEventListener('click', handleClick)
      document.addEventListener('keyup', handleEscPressed)
      document.addEventListener('touchstart', handleTouchStart)
      document.addEventListener('touchend', handleClick)
      document.addEventListener('resized', handleClick)
    }

    function removeCloseActiveZoomListeners () {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('keyup', handleEscPressed)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleClick)
      document.removeEventListener('resized', handleClick)
    }

    function handleScroll (event) {
      if (initialScrollPosition === null) initialScrollPosition = window.pageYOffset
      var deltaY = initialScrollPosition - window.pageYOffset
      if (Math.abs(deltaY) >= 40) closeActiveZoom()
    }

    function handleEscPressed (event) {
      if (event.keyCode === 27) closeActiveZoom()
    }

    function handleClick (event) {
      event.stopPropagation()
      event.preventDefault()
      closeActiveZoom()
    }

    function handleTouchStart (event) {
      initialTouchPosition = event.touches[0].pageY
      event.target.addEventListener('touchmove', handleTouchMove)
    }

    function handleTouchMove (event) {
      if (Math.abs(event.touches[0].pageY - initialTouchPosition) <= 10) return
      closeActiveZoom()
      event.target.removeEventListener('touchmove', handleTouchMove)
    }

    // return { listen: listen }
  })()

  var vanillaZoom = (function () {
    var fullHeight = null
    var fullWidth = null
    var overlay = null
    var imgScaleFactor = null

    var targetImage = null
    var targetImageWrap = null
    var targetImageClone = null

    function zoomImage () {
      var img = document.createElement('img')

      img.onload = function () {
        fullHeight = Number(img.height)
        fullWidth = Number(img.width)
        zoomOriginal()
      }

      img.src = targetImage.currentSrc || targetImage.src
    }

    function zoomOriginal () {
      targetImageWrap = document.createElement('div')
      targetImageWrap.className = 'zoom-img-wrap'

      targetImageWrap.style.top = offset(targetImage).top + 'px'
      targetImageWrap.style.left = offset(targetImage).left + 'px'

      targetImageClone = targetImage.cloneNode()
      targetImageClone.style.visibility = 'hidden'

      targetImage.style.width = targetImage.offsetWidth + 'px'
      targetImage.style.height = targetImage.parentNode.style.height = targetImage.offsetHeight + 'px'

      targetImage.parentNode.replaceChild(targetImageClone, targetImage)

      _body.appendChild(targetImageWrap)
      targetImageWrap.appendChild(targetImage)

      targetImage.classList.add('zoom-img')
      targetImage.setAttribute('data-action', 'zoom-out')

      overlay = document.createElement('div')
      overlay.className = 'zoom-overlay'

      _body.appendChild(overlay)

      calculateZoom()
      triggerAnimation()
    }

    function calculateZoom () {
      targetImage.offsetWidth // repaint before animating
      targetImage.offsetHeight // repaint before animating

      var originalFullImageWidth = fullWidth
      var originalFullImageHeight = fullHeight

      var maxScaleFactor = originalFullImageWidth / targetImage.width

      var viewportHeight = window.innerHeight - OFFSET
      var viewportWidth = window.innerWidth - OFFSET

      var imageAspectRatio = originalFullImageWidth / originalFullImageHeight
      var viewportAspectRatio = viewportWidth / viewportHeight

      if (originalFullImageWidth < viewportWidth && originalFullImageHeight < viewportHeight) {
        imgScaleFactor = maxScaleFactor
      } else if (imageAspectRatio < viewportAspectRatio) {
        imgScaleFactor = (viewportHeight / originalFullImageHeight) * maxScaleFactor
      } else {
        imgScaleFactor = (viewportWidth / originalFullImageWidth) * maxScaleFactor
      }
    }

    function triggerAnimation () {
      targetImage.offsetWidth // repaint before animating
      targetImage.offsetHeight // repaint before animating

      var imageOffset = offset(targetImage)
      var scrollTop = window.pageYOffset

      var viewportY = scrollTop + (window.innerHeight / 2)
      var viewportX = (window.innerWidth / 2)

      var imageCenterY = imageOffset.top + (targetImage.height / 2)
      var imageCenterX = imageOffset.left + (targetImage.width / 2)

      var translateY = Math.round(viewportY - imageCenterY)
      var translateX = Math.round(viewportX - imageCenterX)

      var targetImageTransform = 'scale(' + imgScaleFactor + ')'
      var targetImageWrapTransform =
        'translate3d(' + translateX + 'px, ' + translateY + 'px, 0)'

      targetImage.style.webkitTransform = targetImageTransform
      targetImage.style.msTransform = targetImageTransform
      targetImage.style.transform = targetImageTransform

      targetImageWrap.style.webkitTransform = targetImageWrapTransform
      targetImageWrap.style.msTransform = targetImageWrapTransform
      targetImageWrap.style.transform = targetImageWrapTransform

      _body.classList.add('zoom-overlay-open')
    }

    function close () {
      _body.classList.remove('zoom-overlay-open')
      _body.classList.add('zoom-overlay-transitioning')

      targetImage.style.webkitTransform = null
      targetImage.style.msTransform = null
      targetImage.style.transform = null

      targetImageWrap.style.webkitTransform = null
      targetImageWrap.style.msTransform = null
      targetImageWrap.style.transform = null

      if (!'transition' in _body.style) return dispose()

      targetImageWrap.addEventListener('transitionend', dispose)
      targetImageWrap.addEventListener('webkitTransitionEnd', dispose)
    }

    function dispose () {
      targetImage.removeEventListener('transitionend', dispose)
      targetImage.removeEventListener('webkitTransitionEnd', dispose)

      if (!targetImageWrap || !targetImageWrap.parentNode) return

      targetImage.classList.remove('zoom-img')
      targetImage.style.width = null
      targetImage.style.height = targetImageClone.parentNode.style.height = null
      targetImage.setAttribute('data-action', 'zoom')

      targetImageClone.parentNode.replaceChild(targetImage, targetImageClone)
      targetImageWrap.parentNode.removeChild(targetImageWrap)
      overlay.parentNode.removeChild(overlay)

      _body.classList.remove('zoom-overlay-transitioning')
    }

    return function (target) {
      targetImage = target
      return { zoomImage: zoomImage, close: close, dispose: dispose }
    }
  }())
}

export default zoom
