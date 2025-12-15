// A A17-helperised version of: https://github.com/area17/lazyload
// This version: v2.1.1 - 2018-04-01
// Doc: https://code.area17.com/a17/a17-helpers/wikis/lazyload

var lazyLoad = function (opts) {
  var options = {
    elements: 'img[data-src], img[data-srcset], source[data-srcset], iframe[data-src], video[data-src], [data-lazyload]', // maybe you just want images?
    rootMargin: '0px', // IntersectionObserver option
    threshold: 0 // IntersectionObserver option
  }

  var els = []
  var elsLength
  var observer

  /**
   * Converts HTML collections to an array
   * @private
   * @param {Array} array to convert
   * a loop will work in more browsers than the slice method
   */
  function _htmlCollectionToArray (collection) {
    var a = []
    var i = 0
    for (a = [], i = collection.length; i;) {
      a[--i] = collection[i]
    }
    return a
  }

  /**
   * Removes data- attributes
   * @private
   * @param {Node} element to update
   */
  function _removeDataAttrs (el) {
    el.removeAttribute('data-src')
  }

  /**
   * On loaded, removes event listener, removes data- attributes
   * @private
   */
  function _loaded () {
    this.removeEventListener('load', _loaded)
  }

  /**
   * Update an element
   * @private
   * @param {Node} element to update
   */
  function _updateEl (el) {
    var src = el.getAttribute('data-src')

    _removeDataAttrs(el)

    if (src !== null) el.src = src
  }

  /**
   * The callback from the IntersectionObserver
   * @private
   * @entries {Nodes} elements being observed by the IntersectionObserver
   */
  function _intersection (entries) {
    // Disconnect if we've already loaded all of the images
    if (elsLength === 0) {
      observer.disconnect()
    }
    // Loop through the entries
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i]
      // Are we in viewport?
      if (entry.intersectionRatio > 0) {
        elsLength--
        // Stop watching this and load the image
        observer.unobserve(entry.target)
        entry.target.addEventListener('load', _loaded, false)

        _updateEl(entry.target)
      }
    }
  }

  /**
   * Loops images, checks if in viewport, updates src/src-set
   * @private
   */
  function _setSrcs () {
    var i

    observer = new window.IntersectionObserver(_intersection, {
      rootMargin: options.rootMargin,
      threshold: options.threshold
    })

    elsLength = els.length

    for (i = 0; i < elsLength; i++) {
      if (els[i] && els[i].lazyloaded === undefined) {
        els[i].lazyloaded = true
        observer.observe(els[i])
      }
    }
  }

  /**
   * Gets the show on the road
   * @private
   */
  function _init () {
    els = _htmlCollectionToArray(document.querySelectorAll(options.elements))
    elsLength = els.length

    _setSrcs()
  }

  /**
   * GO GO GO
   * @public
   * @param {object} options (see readme)
   */
  function _lazyLoad () {
    for (var item in opts) {
      if (opts.hasOwnProperty(item)) {
        options[item] = opts[item]
      }
    }

    _init()

    const observer = new window.MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            _init()
          }
        }
      })
    })

    observer.observe(document.body.parentNode, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    })
  }

  _lazyLoad()
}

export default lazyLoad
