import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Straumes 031: the board as weather. Five rivers of work drift up and
// down across a wall tilted eight degrees, each at its own pace, looping
// forever. The scroll wheel (or a vertical drag) pushes every river along
// its own current — the whole wall rushes, then settles. Hovering a
// column slows it to a crawl for a longer look.

const wall = document.getElementById("wall")
const stage = document.getElementById("stage")

// column widths in % of the wall; speeds in px/s, sign = direction
const COLS = [
  { w: 16.5, v: 34 },
  { w: 14, v: -26 },
  { w: 18.5, v: 44 },
  { w: 15, v: -32 },
  { w: 16.5, v: 38 },
]

const cols = COLS.map((cfg, ci) => {
  const col = document.createElement("div")
  col.className = "col"
  col.style.width = cfg.w + "%"
  const track = document.createElement("div")
  track.className = "track"
  col.appendChild(track)
  wall.appendChild(col)
  const state = { ...cfg, track, off: 0, loop: 1, hover: 1, hoverT: 1 }
  col.addEventListener("pointerenter", () => (state.hoverT = 0.12))
  col.addEventListener("pointerleave", () => (state.hoverT = 1))
  return state
})

// deal the thirty works round-robin, then repeat each column's hand enough
// times to cover the wall plus one full loop
function build() {
  const works = shuffled(WORKS, 21)
  const wallH = wall.getBoundingClientRect().height

  cols.forEach((col, ci) => {
    const hand = works.filter((_, i) => i % cols.length === ci)
    const colW = col.track.parentNode.getBoundingClientRect().width
    const gap = Math.max(innerWidth, innerHeight) * 0.011 // matches 1.1vmax in css
    const estimate = hand.reduce((s, w) => s + colW / w.ratio + gap, 0)
    const copies = Math.min(12, Math.max(2, Math.ceil(wallH / estimate) + 1))

    col.track.innerHTML = ""
    for (let c = 0; c < copies; c++) {
      for (const work of hand) {
        const cell = document.createElement("div")
        cell.className = "cell"
        cell.style.setProperty("--ar", work.ratio.toFixed(4))
        cell.appendChild(workImage(work))
        col.track.appendChild(cell)
      }
    }
    // measure the real loop from the dom — one copy's exact height
    const kids = col.track.children
    col.loop = kids.length > hand.length
      ? kids[hand.length].offsetTop - kids[0].offsetTop
      : estimate
    col.off = ci * 173 // stagger the rivers so rows never align
  })
}

let boost = 0

addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    boost += e.deltaY * 0.55
    boost = Math.max(-1500, Math.min(1500, boost))
  },
  { passive: false }
)

// vertical drag scrubs like the wheel
let dragY = null
stage.addEventListener("pointerdown", e => {
  dragY = e.clientY
  stage.setPointerCapture(e.pointerId)
})
stage.addEventListener("pointermove", e => {
  if (dragY == null) return
  boost -= (e.clientY - dragY) * 3.2
  boost = Math.max(-1500, Math.min(1500, boost))
  dragY = e.clientY
})
const endDrag = () => (dragY = null)
stage.addEventListener("pointerup", endDrag)
stage.addEventListener("pointercancel", endDrag)

const mod = (x, m) => ((x % m) + m) % m

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  boost *= Math.pow(0.12, dt)

  for (const col of cols) {
    col.hover += (col.hoverT - col.hover) * Math.min(1, dt * 5)
    const dir = Math.sign(col.v)
    const auto = REDUCED ? 0 : col.v
    col.off += (auto + boost * dir) * col.hover * dt
    const y = -mod(col.off, col.loop)
    col.track.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
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

mountNav(2)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
