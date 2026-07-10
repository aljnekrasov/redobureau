import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Kārtis 038: the whole portfolio as one deck on the felt. The top card
// faces you; the rest fan back in depth. Flick it (drag and release) to
// send it spinning off and the next slides up — or just watch, it deals
// itself every few seconds. It loops forever, so you never run out.

const deck = document.getElementById("deck")
const felt = document.getElementById("felt")

const VISIBLE = 6 // cards you can see stacked
let order = [] // card objects, front-first
let cards = []
let auto = 0
let busy = false

function build() {
  deck.innerHTML = ""
  cards = []
  const works = shuffled(WORKS, 27)
  works.forEach(work => {
    const el = document.createElement("div")
    el.className = "card"
    const frame = document.createElement("div")
    frame.className = "frame"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    frame.appendChild(img)
    el.appendChild(frame)
    deck.appendChild(el)
    cards.push(el)
  })
  order = cards.slice()
  layout(true)
}

// place each card by its depth in the stack
function layout(instant) {
  order.forEach((el, i) => {
    el.style.transition = instant ? "none" : "transform 0.55s cubic-bezier(0.22,1,0.36,1)"
    if (i >= VISIBLE) {
      el.style.transform = `translateY(26px) scale(0.82)`
      el.style.opacity = "0"
      el.style.zIndex = 0
      return
    }
    const d = i / VISIBLE
    el.style.opacity = "1"
    el.style.zIndex = String(order.length - i)
    el.style.transform =
      `translateY(${(-i * 9).toFixed(1)}px) translateX(${(i * 5).toFixed(1)}px) scale(${(1 - d * 0.12).toFixed(3)}) rotate(${(i % 2 ? 1 : -1) * i * 0.5}deg)`
  })
}

// throw the front card away, cycle it to the back
function deal(dir = 1, vx = 0, vy = 0) {
  if (busy || order.length < 2) return
  busy = true
  const front = order.shift()
  const throwX = vx || dir * (innerWidth * 0.9)
  const throwY = vy || -innerHeight * 0.2
  const spin = dir * (40 + Math.random() * 60)
  front.style.transition = "transform 0.6s cubic-bezier(0.4,0,0.6,1), opacity 0.6s"
  front.style.zIndex = String(order.length + 5)
  front.style.transform = `translate(${throwX}px, ${throwY}px) rotate(${spin}deg) scale(0.9)`
  front.style.opacity = "0"
  layout(false)
  setTimeout(() => {
    order.push(front)
    front.style.transition = "none"
    layout(true)
    busy = false
  }, 620)
}

// flick to throw
let downX = 0
let downY = 0
let downT = 0
let down = false
felt.addEventListener("pointerdown", e => {
  down = true
  felt.classList.add("is-dragging")
  downX = e.clientX
  downY = e.clientY
  downT = performance.now()
})
felt.addEventListener("pointerup", e => {
  felt.classList.remove("is-dragging")
  if (!down) return
  down = false
  const dt = Math.max(1, performance.now() - downT)
  const dx = e.clientX - downX
  const dy = e.clientY - downY
  if (Math.hypot(dx, dy) > 40) {
    const vx = (dx / dt) * 620
    const vy = (dy / dt) * 620
    deal(Math.sign(dx || 1), vx, vy)
  } else {
    deal(1)
  }
  auto = 0
})
felt.addEventListener("pointercancel", () => {
  down = false
  felt.classList.remove("is-dragging")
})

let prev = performance.now()
function frame(now) {
  const dt = (now - prev) / 1000
  prev = now
  if (!REDUCED) {
    auto += dt
    if (auto > 3.6) {
      auto = 0
      deal(1)
    }
  }
  requestAnimationFrame(frame)
}

addEventListener("resize", () => layout(true))

mountNav(9)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
