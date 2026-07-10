import { WORKS, REDUCED, rng, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Dzilums 033: the board has depth instead of edges. Thirty works hang in
// a dark corridor of space; the wheel (or a vertical drag) flies the
// camera through them, the mouse steers the gaze a few degrees. Works
// condense out of the fog ahead, slide past at their own slight angles
// and dissolve behind you — the corridor loops, so the flight never ends.

const view = document.getElementById("view")
const look = document.getElementById("look")
const world = document.getElementById("world")

const SPACING = 360 // px of depth between consecutive works
const DEPTH = WORKS.length * SPACING
const FAR = 4400 // fog wall: where works are fully faded out
const NEAR_EXIT = 140 // how far behind the camera a work slips before wrapping

let vw = innerWidth
let vh = innerHeight

let cards = []

function build() {
  vw = innerWidth
  vh = innerHeight
  world.innerHTML = ""
  cards = []

  const works = shuffled(WORKS, 17)
  const r = rng(29)
  const scale = Math.max(0.7, Math.min(1.4, Math.min(vw, vh) / 800))

  works.forEach((work, i) => {
    const el = document.createElement("div")
    el.className = "card"

    let w = (250 + r() * 240) * scale
    if (work.ratio < 1) w *= 0.7
    if (work.ratio > 2.4) w *= 1.5
    el.style.width = w + "px"
    el.style.setProperty("--ar", work.ratio.toFixed(4))
    el.appendChild(workImage(work))

    // scattered around a loose corridor; a couple sit close to the axis
    // and will sweep right past the camera
    const a = r() * Math.PI * 2
    const rad = (0.1 + r() * 0.46) * Math.max(vw, vh)
    const card = {
      el,
      x: Math.cos(a) * rad * 1.15,
      y: Math.sin(a) * rad * 0.62,
      z: -(i * SPACING + r() * SPACING * 0.6),
      tilt: (r() * 2 - 1) * 9,
    }
    world.appendChild(el)
    cards.push(card)
  })
}

// --- travel ---------------------------------------------------------------------

let camZ = 0
let camV = 0
let idle = 99
let tmx = 0
let tmy = 0
let mx = 0
let my = 0

addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    camV += e.deltaY * 14
    camV = Math.max(-9000, Math.min(9000, camV))
    idle = 0
  },
  { passive: false }
)

let dragY = null
view.addEventListener("pointerdown", e => {
  dragY = e.clientY
  view.setPointerCapture(e.pointerId)
  idle = 0
})
view.addEventListener("pointermove", e => {
  tmx = (e.clientX / vw) * 2 - 1
  tmy = (e.clientY / vh) * 2 - 1
  if (dragY == null) return
  camZ -= (e.clientY - dragY) * 4
  camV = 0
  dragY = e.clientY
  idle = 0
})
const endDrag = () => (dragY = null)
view.addEventListener("pointerup", endDrag)
view.addEventListener("pointercancel", endDrag)

// --- flight ---------------------------------------------------------------------

const mod = (x, m) => ((x % m) + m) % m

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  idle += dt

  // cruise on its own once the hand lets go
  const cruise = REDUCED || idle < 2.5 ? 0 : 46
  camZ += (camV + cruise) * dt
  camV *= Math.pow(0.14, dt)

  const km = Math.min(1, dt * 3.2)
  mx += (tmx - mx) * km
  my += (tmy - my) * km
  look.style.transform = `rotateY(${(mx * 4).toFixed(3)}deg) rotateX(${(-my * 3).toFixed(3)}deg)`
  world.style.transform = `translate3d(0, 0, ${camZ.toFixed(2)}px)`

  for (const card of cards) {
    // distance in front of the camera: 0 at the lens, DEPTH at the far end
    const ahead = mod(-(card.z + camZ), DEPTH) - NEAR_EXIT
    const z = -(ahead)
    card.el.style.transform =
      `translate(-50%, -50%) translate3d(${card.x.toFixed(1)}px, ${card.y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${card.tilt}deg)`
    let o
    if (ahead > FAR) o = 0
    else if (ahead > FAR * 0.45) o = 1 - (ahead - FAR * 0.45) / (FAR * 0.55)
    else if (ahead < 60) o = Math.max(0, ahead / 60)
    else o = 1
    card.el.style.opacity = o.toFixed(3)
  }

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 220)
})

mountNav(4)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
