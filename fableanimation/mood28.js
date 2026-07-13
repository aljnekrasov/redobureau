import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Lietus 057: the portfolio as rain. Works fall in parallel columns, each at
// its own speed, brightest at the leading edge and dissolving up the trail
// like the tails of a downpour. The wheel or a drag opens the tap wider —
// the whole shower rushes, then eases back to a drizzle.

const stage = document.getElementById("stage")

const COLS = [
  { v: 150 },
  { v: 96 },
  { v: 200 },
  { v: 120 },
  { v: 168 },
  { v: 108 },
]

let cols = []
let boost = 0

function build() {
  stage.innerHTML = ""
  cols = []
  const works = shuffled(WORKS, 57)
  const n = COLS.length
  COLS.forEach((cfg, ci) => {
    const col = document.createElement("div")
    col.className = "col"
    const track = document.createElement("div")
    track.className = "track"
    col.appendChild(track)
    stage.appendChild(col)

    const colW = col.getBoundingClientRect().width || innerWidth / n
    const hand = works.filter((_, i) => i % n === ci)
    const gap = 8
    const heights = hand.map(w => colW / Math.min(Math.max(w.ratio, 0.7), 2.0))
    const estimate = heights.reduce((s, h) => s + h + gap, 0)
    const copies = Math.min(10, Math.max(2, Math.ceil(innerHeight / estimate) + 1))

    for (let c = 0; c < copies; c++) {
      hand.forEach((work, i) => {
        const drop = document.createElement("div")
        drop.className = "drop"
        drop.style.height = heights[i] + "px"
        drop.style.marginBottom = gap + "px"
        const img = workImage(work)
        img.classList.remove("work")
        img.addEventListener("load", () => img.classList.add("on"), { once: true })
        if (img.complete && img.naturalWidth) img.classList.add("on")
        drop.appendChild(img)
        track.appendChild(drop)
      })
    }
    const kids = track.children
    const loop = kids.length > hand.length ? kids[hand.length].offsetTop - kids[0].offsetTop : estimate
    cols.push({ track, v: cfg.v, loop, off: ci * 137 })
  })
}

addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    boost = Math.max(-900, Math.min(1400, boost + e.deltaY * 0.6))
  },
  { passive: false }
)
let dragY = null
stage.addEventListener("pointerdown", e => {
  dragY = e.clientY
  stage.setPointerCapture(e.pointerId)
})
stage.addEventListener("pointermove", e => {
  if (dragY == null) return
  boost = Math.max(-900, Math.min(1400, boost + (e.clientY - dragY) * 2))
  dragY = e.clientY
})
const end = () => (dragY = null)
stage.addEventListener("pointerup", end)
stage.addEventListener("pointercancel", end)

const mod = (x, m) => ((x % m) + m) % m

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  boost *= Math.pow(0.2, dt)

  for (const col of cols) {
    const speed = (REDUCED ? 0 : col.v) + boost
    col.off += speed * dt
    // fall downward: translate the track down, wrapping by one loop
    const y = mod(col.off, col.loop) - col.loop
    col.track.style.transform = `translateY(${y.toFixed(1)}px)`
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

mountNav(28)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
