import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Vilnis 048: the whole grid of works breathing as one surface. A diagonal
// wave travels across the tiles — each lifts toward you, tilts and brightens
// on the crest, then sinks back into shadow on the trough, so the board
// ripples like water under wind. The cursor raises a swell of its own that
// the tiles rise to meet.

const stage = document.getElementById("stage")
const grid = document.getElementById("grid")

let cols = 6
let rows = 5
let tiles = []
let vw = 0
let vh = 0
let mx = -1e4
let my = -1e4
let t = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  const aspect = vw / vh
  ;[cols, rows] = aspect < 0.7 ? [4, 8] : aspect < 1.3 ? [5, 6] : [6, 5]
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`
  grid.innerHTML = ""
  tiles = []
  const works = shuffled(WORKS, 48)
  const n = cols * rows
  for (let k = 0; k < n; k++) {
    const el = document.createElement("div")
    el.className = "tile"
    const img = workImage(works[k % works.length])
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    el.appendChild(img)
    grid.appendChild(el)
    tiles.push({ el, col: k % cols, row: Math.floor(k / cols) })
  }
}

addEventListener("pointermove", e => {
  mx = e.clientX
  my = e.clientY
})
addEventListener("pointerleave", () => {
  mx = my = -1e4
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += REDUCED ? dt * 0.3 : dt

  const cw = vw / cols
  const ch = vh / rows
  for (const tile of tiles) {
    // traveling diagonal wave
    const phase = t * 1.7 - (tile.col * 0.55 + tile.row * 0.62)
    let s = Math.sin(phase)

    // cursor swell — tiles near the pointer rise
    const tcx = (tile.col + 0.5) * cw
    const tcy = (tile.row + 0.5) * ch
    const d = Math.hypot(tcx - mx, tcy - my)
    const bump = Math.max(0, 1 - d / (Math.min(vw, vh) * 0.4))

    const z = s * 55 + bump * bump * 130
    const rotX = s * 22 - (bump ? (tcy < my ? -1 : 1) * bump * 6 : 0)
    const rotY = Math.cos(phase * 0.8) * 12
    const scale = 1 + s * 0.03 + bump * 0.05
    const bright = 0.55 + (s * 0.5 + 0.5) * 0.35 + bump * 0.25

    tile.el.style.transform =
      `translateZ(${z.toFixed(1)}px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`
    tile.el.style.zIndex = Math.round(z + 200)
    tile.el.style.filter = `brightness(${Math.min(1.2, bright).toFixed(2)})`
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

mountNav(19)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
