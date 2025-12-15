var injectCSS = function (css) {
  if (!css || typeof css !== 'string') return

  var head = document.head || document.getElementsByTagName('head')[0]
  var style = document.createElement('style')

  style.type = 'text/css'

  head.appendChild(style)

  function _set (css) {
    if (style.styleSheet) {
      style.styleSheet.cssText = css
    } else {
      while (style.childNodes.length) {
        style.removeChild(style.firstChild)
      }

      style.appendChild(document.createTextNode(css))
    }
  }

  function _destroy () {
    head.removeChild(style)
    style = null
  }

  _set(css)

  return {
    set: function (css) {
      _set(css)
    },

    destroy: function () {
      _destroy()
    }
  }
}

export default injectCSS
