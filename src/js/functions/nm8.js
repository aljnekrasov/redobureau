function nm8 (fn, duration) {
  var rate
  var currentTime
  var elapsed
  var tick = function (timeStamp) {
    var delta = +!rate || -(currentTime || timeStamp) + (currentTime = timeStamp)
    fn(duration ? Math.min(Math.max((elapsed += delta) / duration, 0), 1) : delta)
    return !rate || elapsed >= duration || window.requestAnimationFrame(tick)
  }

  var nm810 = {
    play: function () {
      return ((rate = 1), (duration && elapsed <= duration) || (elapsed = 0), tick(window.performance.now()), nm810)
    },
    pause: function () {
      return ((rate = 0), nm810)
    },
    stop: function () {
      return ((elapsed = currentTime = rate = 0), nm810)
    }
  }

  return nm810
}
export default nm8
