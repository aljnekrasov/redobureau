import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Ritenis 046: thirty works splayed from a single pivot at the floor like a
// peacock's tail — or a hand of cards fanned wide. Drag left/right to spin
// the whole fan around its hinge (with momentum); hover a card and it lifts
// clear of the stack for a look. Slowly sways on its own.

const stage = document.getElementById("stage")
const pivot = document.getElementById("pivot")

const SPREAD = 140 // total splay in degrees
let cards = []
let offset = 0
let vel = 0
let dragging = false
let lastX = 0
let lastT = 0
let t = 0

function build() {
  const vmin = Math.min(innerWidth, innerHeight)
  pivot.querySelectorAll(".card").forEach(c => c.remove())
  cards = []
  const works = shuffled(WORKS, 46)
  const n = works.length
  const step = SPREAD / (n - 1)
  const w = vmin * 0.145
  const h = vmin * 0.44

  works.forEach((work, i) => {
    const card = document.createElement("div")
    card.className = "card"
    card.style.width = w + "px"
    card.style.height = h + "px"
    card.style.pointerEvents = "auto"
    const frame = document.createElement("div")
    frame.className = "frame"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    frame.appendChild(img)
    card.appendChild(frame)
    pivot.appendChild(card)

    const c = { el: card, w, angle: -SPREAD / 2 + i * step, lift: 0, liftT: 0, z: i }
    card.style.zIndex = i
    card.addEventListener("pointerenter", () => (c.liftT = 1))
    card.addEventListener("pointerleave", () => (c.liftT = 0))
    cards.push(c)
  })
}

stage.addEventListener("pointerdown", e => {
  dragging = true
  stage.classList.add("is-dragging")
  stage.setPointerCapture(e.pointerId)
  lastX = e.clientX
  lastT = performance.now()
  vel = 0
})
stage.addEventListener("pointermove", e => {
  if (!dragging) return
  const now = performance.now()
  const dt = Math.max(8, now - lastT) / 1000
  const dA = (e.clientX - lastX) * 0.14
  offset += dA
  vel = vel * 0.5 + (dA / dt) * 0.5
  lastX = e.clientX
  lastT = now
})
const end = () => {
  dragging = false
  stage.classList.remove("is-dragging")
}
stage.addEventListener("pointerup", end)
stage.addEventListener("pointercancel", end)

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt

  if (!dragging) {
    offset += vel * dt
    vel *= Math.pow(0.2, dt)
    if (!REDUCED) offset += Math.sin(t * 0.4) * 3 * dt // idle sway
  }
  // keep the fan from winding away forever
  const limit = SPREAD * 0.62
  if (offset > limit) {
    offset = limit
    vel = 0
  } else if (offset < -limit) {
    offset = -limit
    vel = 0
  }

  for (const c of cards) {
    c.lift += (c.liftT - c.lift) * Math.min(1, dt * 10)
    c.el.style.zIndex = c.liftT ? 200 : c.z
    const lift = c.lift * innerHeight * 0.12
    c.el.style.transform =
      `translateX(-50%) rotate(${(c.angle + offset).toFixed(2)}deg) translateY(${(-lift).toFixed(1)}px) scale(${(1 + c.lift * 0.06).toFixed(3)})`
    c.el.style.filter = c.lift > 0.02 ? "none" : "brightness(0.82)"
  }

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 200)
})

mountNav(17)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
