var trigger = function (el, type, data) {
  var event = new window.CustomEvent(type, { detail: data })
  el.dispatchEvent(event)
}

export default trigger
