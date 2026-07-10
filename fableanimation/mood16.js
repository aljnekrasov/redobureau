import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Tīkls 045: the portfolio strung into an elastic net. Thirty works are the
// nodes of a 6×5 mesh, joined by springs and each tied loosely to its home
// spot. Grab any work and drag — the whole web stretches, sags and springs
// back, the neighbours trailing after it. Verlet integration on the nodes,
// the links drawn on a canvas behind the images.

const stage = document.getElementById("stage")
const canvas = document.getElementById("web")
const ctx = canvas.getContext("2d")

const COLS = 6
const ROWS = 5

let vw = 0
let vh = 0
let nodes = []
let links = []
let grabbed = null
let px0 = 0
let py0 = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  stage.querySelectorAll(".node").forEach(n => n.remove())
  nodes = []
  links = []

  const sx = vw / (COLS + 1)
  const sy = vh / (ROWS + 1)
  const size = Math.min(sx, sy) * 0.74
  const works = shuffled(WORKS, 45)

  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const hx = sx * (i + 1)
      const hy = sy * (j + 1)
      const el = document.createElement("div")
      el.className = "node"
      const work = works[j * COLS + i]
      const w = size
      const h = w / Math.min(Math.max(work.ratio, 0.8), 1.6)
      el.style.width = w + "px"
      el.style.height = h + "px"
      const img = workImage(work)
      img.classList.remove("work")
      img.addEventListener("load", () => img.classList.add("on"), { once: true })
      if (img.complete && img.naturalWidth) img.classList.add("on")
      el.appendChild(img)
      stage.appendChild(el)
      nodes.push({ el, w, h, x: hx, y: hy, px: hx, py: hy, hx, hy, i, j })
    }
  }

  const at = (i, j) => nodes[j * COLS + i]
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (i < COLS - 1) addLink(at(i, j), at(i + 1, j))
      if (j < ROWS - 1) addLink(at(i, j), at(i, j + 1))
    }
  }
}

function addLink(a, b) {
  links.push({ a, b, rest: Math.hypot(a.hx - b.hx, a.hy - b.hy) })
}

function nearest(x, y) {
  let best = null
  let bd = 60 * 60
  for (const n of nodes) {
    const d = (n.x - x) ** 2 + (n.y - y) ** 2
    if (d < bd) {
      bd = d
      best = n
    }
  }
  return best
}

stage.addEventListener("pointerdown", e => {
  grabbed = nearest(e.clientX, e.clientY) || nodes[0]
  stage.classList.add("is-dragging")
  stage.setPointerCapture(e.pointerId)
  px0 = e.clientX
  py0 = e.clientY
})
stage.addEventListener("pointermove", e => {
  if (!grabbed) return
  grabbed.x = e.clientX
  grabbed.y = e.clientY
  grabbed.px = e.clientX
  grabbed.py = e.clientY
})
const release = () => {
  grabbed = null
  stage.classList.remove("is-dragging")
}
stage.addEventListener("pointerup", release)
stage.addEventListener("pointercancel", release)

let t = 0
let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt

  // verlet integrate + home spring + a breath of ambient sway
  for (const n of nodes) {
    if (n === grabbed) continue
    const vx = (n.x - n.px) * 0.9
    const vy = (n.y - n.py) * 0.9
    n.px = n.x
    n.py = n.y
    n.x += vx
    n.y += vy
    const sway = REDUCED ? 0 : Math.sin(t * 0.8 + n.i * 0.7 + n.j) * 6 * dt
    n.x += (n.hx - n.x) * 0.02 + sway
    n.y += (n.hy - n.y) * 0.02
  }

  // satisfy spring constraints
  for (let k = 0; k < 3; k++) {
    for (const l of links) {
      const dx = l.b.x - l.a.x
      const dy = l.b.y - l.a.y
      const d = Math.hypot(dx, dy) || 1
      const diff = ((d - l.rest) / d) * 0.5
      const ox = dx * diff
      const oy = dy * diff
      if (l.a !== grabbed) {
        l.a.x += ox
        l.a.y += oy
      }
      if (l.b !== grabbed) {
        l.b.x -= ox
        l.b.y -= oy
      }
    }
  }

  // draw links
  ctx.clearRect(0, 0, vw, vh)
  ctx.lineWidth = 1
  ctx.strokeStyle = "rgba(150,170,190,0.16)"
  ctx.beginPath()
  for (const l of links) {
    ctx.moveTo(l.a.x, l.a.y)
    ctx.lineTo(l.b.x, l.b.y)
  }
  ctx.stroke()

  // place images
  for (const n of nodes) {
    n.el.style.transform = `translate(${(n.x - n.w / 2).toFixed(1)}px, ${(n.y - n.h / 2).toFixed(1)}px)`
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

mountNav(16)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
