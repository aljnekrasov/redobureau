import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Tunelis 058: the works tiled onto the inside of a pipe you fly through.
// Rings of panels line the wall, curving overhead and underfoot; the camera
// races down the bore, rings rushing past and wrapping around so the flight
// never ends. Wheel or drag to throttle; let go and it cruises.

const view = document.getElementById("view")
const world = document.getElementById("world")

const PER_RING = 6
const RING_GAP = 460

let vw = 0
let vh = 0
let radius = 500
let panels = []
let depth = 1
let camZ = 0
let camV = 220
let idle = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  radius = Math.min(vw, vh) * 0.46
  world.innerHTML = ""
  panels = []
  const works = shuffled(WORKS, 58)
  const rings = Math.ceil(works.length / PER_RING)
  depth = rings * RING_GAP
  // panel tiles the wall: arc chord (around the tube) × ring gap (along it)
  const arcW = ((2 * Math.PI * radius) / PER_RING) * 1.02
  const panH = RING_GAP * 1.02

  works.forEach((work, i) => {
    const ring = Math.floor(i / PER_RING)
    const slot = i % PER_RING
    const el = document.createElement("div")
    el.className = "panel"
    el.style.width = arcW + "px"
    el.style.height = panH + "px"
    el.style.marginLeft = -arcW / 2 + "px"
    el.style.marginTop = -panH / 2 + "px"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    el.appendChild(img)
    world.appendChild(el)
    panels.push({ el, z0: ring * RING_GAP, angle: (slot / PER_RING) * 360 })
  })
}

view.addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    camV = Math.max(-1400, Math.min(1600, camV + e.deltaY * 1.4))
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
  if (dragY == null) return
  camV = Math.max(-1400, Math.min(1600, camV - (e.clientY - dragY) * 6))
  dragY = e.clientY
  idle = 0
})
const end = () => (dragY = null)
view.addEventListener("pointerup", end)
view.addEventListener("pointercancel", end)

const mod = (x, m) => ((x % m) + m) % m

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  idle += dt

  camZ += camV * dt
  camV *= Math.pow(0.5, dt)
  const cruise = REDUCED ? 0 : 220
  if (idle > 1.2) camV += (cruise - camV) * Math.min(1, dt * 0.6)

  for (const p of panels) {
    // depth in front of the camera, wrapped so rings recycle
    const z = mod(p.z0 + camZ, depth) - 120
    // fade far and very near
    let o = 1
    if (z > depth * 0.55) o = Math.max(0, 1 - (z - depth * 0.55) / (depth * 0.45))
    else if (z < 40) o = Math.max(0, z / 40)
    p.el.style.opacity = o.toFixed(3)
    // wall of a tube around the view axis: go to depth, spin to this angle,
    // push out to the wall, then lie the panel tangent facing inward
    p.el.style.transform =
      `translateZ(${(-z).toFixed(1)}px) rotateZ(${p.angle}deg) translateY(${radius}px) rotateX(90deg)`
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

mountNav(29)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
