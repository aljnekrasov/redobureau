const transit = function (options = {}) {
  const defaults = {
    el: window.document.body,
    target: window.document.body,
    from: '-hidden',
    transit: '-transit',
    to: '-active',
    reverse: false
  }

  options = Object.assign(defaults, options)

  options.reverse
    ? options.el.classList.remove(options.to)
    : options.el.classList.add(options.transit, options.from)

  options.target.offsetWidth // repaint

  options.reverse
    ? options.el.classList.add(options.transit, options.from)
    : options.el.classList.add(options.to)

  options.target.addEventListener('transitionend', function handler (e) {
    options.el.classList.remove(options.transit, options.from)
    options.target.removeEventListener('transitionend', handler)

    if (options.after && typeof options.after === 'function') {
      options.after(options.el, options.target)
    }
  })
}

export default transit
