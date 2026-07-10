import { WORKS, REDUCED, workImage, mountNav, onViewport } from "./moodworks.js"

// Bezgalība 035: one endless plane of work. Drag in any direction and the
// grid tiles forever — cells that leave one edge are recycled onto the
// opposite one, so there's no seam and no bottom. Flick for momentum; let
// go and it keeps drifting on its own. A DOM tile pool (never more than the
// screen needs) is repositioned each frame, so "infinite" costs nothing.

const stage = document.getElementById("stage")

let vw = innerWidth
let vh = innerHeight
let CW = 300 // cell size incl. gutter
let CH = 210
const GUT = 5

let panX = 0
let panY = 0
let velX = 0
let velY = 0
let dragging = false
let lastX = 0
let lastY = 0
let lastT = 0
let idle = 0
let t = 0

const pool = [] // spare tile elements
const live = new Map() // "col,row" -> { el, key }

// stable, well-mixed work for a cell so neighbours rarely repeat
function workAt(col, row) {
  let h = (col * 374761393 + row * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return WORKS[((h >>> 0) % WORKS.length + WORKS.length) % WORKS.length]
}

function takeTile() {
  if (pool.length) return pool.pop()
  const el = document.createElement("div")
  el.className = "tile"
  const img = workImage(WORKS[0])
  img.classList.remove("work")
  el.appendChild(img)
  stage.appendChild(el)
  return el
}

function size() {
  vw = innerWidth
  vh = innerHeight
  const base = Math.min(vw, vh)
  CW = Math.round(base * 0.34) + GUT
  CH = Math.round(base * 0.24) + GUT
  for (const el of stage.children) {
    el.style.width = CW - GUT + "px"
    el.style.height = CH - GUT + "px"
  }
}

stage.addEventListener("pointerdown", e => {
  dragging = true
  stage.classList.add("is-dragging")
  stage.setPointerCapture(e.pointerId)
  lastX = e.clientX
  lastY = e.clientY
  lastT = performance.now()
  velX = velY = 0
  idle = 0
})
stage.addEventListener("pointermove", e => {
  if (!dragging) return
  const now = performance.now()
  const dt = Math.max(8, now - lastT) / 1000
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  panX += dx
  panY += dy
  velX = velX * 0.6 + (dx / dt) * 0.4
  velY = velY * 0.6 + (dy / dt) * 0.4
  lastX = e.clientX
  lastY = e.clientY
  lastT = now
  idle = 0
})
const end = () => {
  dragging = false
  stage.classList.remove("is-dragging")
}
stage.addEventListener("pointerup", end)
stage.addEventListener("pointercancel", end)
addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    panX -= e.deltaX
    panY -= e.deltaY
    velX = velY = 0
    idle = 0
  },
  { passive: false }
)

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt
  idle += dt

  if (!dragging) {
    panX += velX * dt
    panY += velY * dt
    const f = Math.pow(0.12, dt)
    velX *= f
    velY *= f
    if (idle > 3.5 && !REDUCED) {
      // gentle perpetual drift once you stop touching it
      panX -= Math.cos(t * 0.16) * 14 * dt
      panY -= Math.sin(t * 0.13) * 14 * dt
    }
  }

  // which columns / rows cover the screen right now
  const c0 = Math.floor(-panX / CW) - 1
  const c1 = Math.floor((-panX + vw) / CW) + 1
  const r0 = Math.floor(-panY / CH) - 1
  const r1 = Math.floor((-panY + vh) / CH) + 1

  const need = new Set()
  for (let c = c0; c <= c1; c++) {
    for (let r = r0; r <= r1; r++) {
      const key = c + "," + r
      need.add(key)
      let tile = live.get(key)
      if (!tile) {
        const el = takeTile()
        const img = el.firstChild
        const work = workAt(c, r)
        if (img.src !== new URL(work.src, location.href).href) {
          img.classList.remove("on")
          img.src = work.src
          if (img.complete && img.naturalWidth) img.classList.add("on")
          else img.onload = () => img.classList.add("on")
        }
        tile = { el, key }
        live.set(key, tile)
      }
      tile.el.style.transform = `translate3d(${(c * CW + panX).toFixed(1)}px, ${(r * CH + panY).toFixed(1)}px, 0)`
    }
  }
  for (const [key, tile] of live) {
    if (!need.has(key)) {
      tile.el.style.transform = "translate3d(-9999px,-9999px,0)"
      pool.push(tile.el)
      live.delete(key)
    }
  }

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) size()
  }, 200)
})

mountNav(6)
onViewport(() => {
  size()
  prev = performance.now()
  requestAnimationFrame(frame)
})
