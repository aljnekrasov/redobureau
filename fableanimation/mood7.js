import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Gaisma 036: thirty works cover the wall wall-to-wall, but the room is
// pitch dark. Your cursor is a torch — only the disc of wall it lands on
// lights up in full colour, everything else stays in shadow. Move it like
// you're reading a contact sheet by candlelight. Idle, the beam wanders on
// its own. The whole wall breathes with the faintest parallax.

const wall = document.getElementById("wall")
const dark = document.getElementById("dark")
const glow = document.getElementById("glow")

let vw = innerWidth
let vh = innerHeight
let tx = vw / 2 // torch target
let ty = vh / 2
let x = tx // smoothed torch
let y = ty
let idle = 0
let t = 0
let px = 0 // parallax
let py = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  const aspect = vw / vh
  const [cols, rows] = aspect < 0.7 ? [4, 8] : aspect < 1.3 ? [5, 6] : [6, 5]
  wall.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
  wall.style.gridTemplateRows = `repeat(${rows}, 1fr)`
  wall.innerHTML = ""
  const works = shuffled(WORKS, 41)
  const n = cols * rows
  for (let i = 0; i < n; i++) {
    const cell = document.createElement("div")
    cell.className = "cell"
    const img = workImage(works[i % works.length])
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    cell.appendChild(img)
    wall.appendChild(cell)
  }
  const r = Math.round(Math.min(vw, vh) * 0.19)
  dark.style.setProperty("--r", r + "px")
}

addEventListener("pointermove", e => {
  tx = e.clientX
  ty = e.clientY
  idle = 0
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt
  idle += dt

  if (idle > 2.4 && !REDUCED) {
    // the torch drifts across the wall when left alone
    tx = vw * (0.5 + 0.36 * Math.sin(t * 0.31))
    ty = vh * (0.5 + 0.32 * Math.cos(t * 0.23))
  }

  const k = Math.min(1, dt * 7)
  x += (tx - x) * k
  y += (ty - y) * k

  dark.style.setProperty("--x", x.toFixed(1) + "px")
  dark.style.setProperty("--y", y.toFixed(1) + "px")
  glow.style.setProperty("--gx", x.toFixed(1) + "px")
  glow.style.setProperty("--gy", y.toFixed(1) + "px")

  // wall leans a hair away from the beam — depth without motion sickness
  const tpx = -((x / vw) * 2 - 1) * 12
  const tpy = -((y / vh) * 2 - 1) * 12
  px += (tpx - px) * k
  py += (tpy - py) * k
  wall.style.transform = `scale(1.04) translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 200)
})

mountNav(7)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
