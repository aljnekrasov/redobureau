import "./polyfills/polyfills"

import "./polyfills/polyfills"
import quicklink from "quicklink"
import {
  resized,
  scrolled,
  lazyLoad,
  oritentationChangeFix,
  messages,
  threedthings,
  arThings,
} from "./helpers"
import * as Behaviors from "./behaviors"
import { manageBehaviors } from "./functions/manageBehaviors"
import zoom from "./functions/zoom"
;(function (d) {
  var _html = (window._html = d.documentElement)
  var isTouch = (window.isTouch =
    "ontouchstart" in window ||
    (window.documentTouch && d instanceof window.DocumentTouch)
      ? 1
      : 0)

  // Go Quicklink
  // see https://github.com/GoogleChromeLabs/quicklink
  quicklink()

  // Remove 300ms delay on Tap
  // Add helpers class && :active on touch devices
  // ----------------------------------------------------------------------------
  _html.classList.add(isTouch ? "touch" : "no-touch")
  isTouch && window.addEventListener("touchstart", () => {}, true)

  var options = {
    rootMargin: "300%", // IntersectionObserver option
  }

  function init() {
    threedthings()
    arThings()
    manageBehaviors(Behaviors)
    oritentationChangeFix()
    lazyLoad(options)
    scrolled()
    resized()
    messages()
    zoom()
    balanceText()
  }
  document.addEventListener("DOMContentLoaded", function () {
    init()
  })
})(document)
