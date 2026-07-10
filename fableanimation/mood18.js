import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Lente 047: the portfolio as a strip of film. Frames run edge to edge with
// sprocket holes above and below; the reel scrolls sideways forever and the
// frame passing the centre playhead swells, coverflow-style, while the rest
// recede. Wheel or drag to scrub, flick for momentum, let go and it keeps
// spooling.

const stage = document.getElementById("stage")
const strip = document.getElementById("strip")
const track = document.getElementById("track")

let vw = 0
let cells = []
let loop = 1
let off = 0
let vel = 22 // px/s idle spool

function build() {
  vw = innerWidth
  track.innerHTML = ""
  cells = []
  const stripH = strip.getBoundingClientRect().height * 0.76
  const works = shuffled(WORKS, 47)

  // one hand of cells, then repeat enough to cover 2 screens + a loop
  const widths = works.map(w => stripH * Math.min(Math.max(w.ratio, 0.7), 2.2))
  const gap = 10
  loop = widths.reduce((s, w) => s + w + gap, 0)
  const copies = Math.max(2, Math.ceil((vw * 2) / loop) + 1)

  let x = 0
  for (let c = 0; c < copies; c++) {
    works.forEach((work, i) => {
      const cell = document.createElement("div")
      cell.className = "cell"
      cell.style.width = widths[i] + "px"
      cell.style.left = x + "px"
      const frame = document.createElement("div")
      frame.className = "frame"
      const img = workImage(work)
      img.classList.remove("work")
      img.addEventListener("load", () => img.classList.add("on"), { once: true })
      if (img.complete && img.naturalWidth) img.classList.add("on")
      frame.appendChild(img)
      cell.appendChild(frame)
      track.appendChild(cell)
      cells.push({ el: cell, x, w: widths[i] })
      x += widths[i] + gap
    })
  }
}

addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    off += (e.deltaX || e.deltaY) * 0.8
    vel = 0
  },
  { passive: false }
)

let dragX = null
let lastT = 0
stage.addEventListener("pointerdown", e => {
  dragX = e.clientX
  lastT = performance.now()
  stage.setPointerCapture(e.pointerId)
  vel = 0
})
stage.addEventListener("pointermove", e => {
  if (dragX == null) return
  const now = performance.now()
  const dt = Math.max(8, now - lastT) / 1000
  const dx = e.clientX - dragX
  off -= dx
  vel = -(dx / dt) * 0.6 + vel * 0.4
  dragX = e.clientX
  lastT = now
})
const end = () => (dragX = null)
stage.addEventListener("pointerup", end)
stage.addEventListener("pointercancel", end)

const mod = (x, m) => ((x % m) + m) % m

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (dragX == null) {
    off += vel * dt
    vel *= Math.pow(0.3, dt)
    if (Math.abs(vel) < 22 && !REDUCED) vel += (22 - vel) * Math.min(1, dt * 0.4)
  }

  const shift = -mod(off, loop)
  track.style.transform = `translateX(${shift.toFixed(1)}px)`

  // swell the frame over the centre playhead
  const cx = vw / 2
  for (const c of cells) {
    const center = c.x + shift + c.w / 2
    // account for the wrap: test the nearest copy
    let d = center - cx
    if (d > loop / 2) d -= loop
    if (d < -loop / 2) d += loop
    const t = Math.max(0, 1 - Math.abs(d) / (vw * 0.34))
    const s = 1 + t * t * 0.5
    c.el.style.transform = `scale(${s.toFixed(3)})`
    c.el.style.zIndex = Math.round(s * 100)
    c.el.style.filter = `brightness(${(0.6 + t * 0.4).toFixed(2)})`
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

mountNav(18)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
