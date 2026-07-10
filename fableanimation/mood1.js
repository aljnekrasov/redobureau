import { WORKS, REDUCED, rng, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Galds 030: all thirty works tossed onto one huge table. Prints land with
// a dealt-cards stagger, then the surface drifts on its own; grab it to
// pan, flick it for inertia. Every print carries its own depth, so the
// pile slides apart slightly as it moves. Hovering a print straightens
// and lifts it off the felt.
//
// Each print is its own small composited layer (transform per frame on 30
// elements) — one board-sized layer would blow the raster budget of
// embedded compositors.

const stage = document.getElementById("stage")

let vw = innerWidth
let vh = innerHeight
let bw = 0 // board size, ~2.3 viewports
let bh = 0

let panX = 0
let panY = 0
let velX = 0
let velY = 0
let mx = 0 // smoothed mouse parallax, -1..1
let my = 0
let tmx = 0
let tmy = 0
let dragging = false
let lastX = 0
let lastY = 0
let lastT = 0
let idle = 99 // seconds since last touch — drift resumes when it grows
let t = 0

let prints = [] // { el, x, y, depth }

// even scatter via best-candidate sampling: every new print lands as far
// from the already placed ones as the candidates allow
function scatter(n, r) {
  const pts = []
  const mX = bw * 0.1
  const mY = bh * 0.11
  for (let i = 0; i < n; i++) {
    let best = null
    let bestD = -1
    for (let k = 0; k < 16; k++) {
      const c = { x: mX + r() * (bw - mX * 2), y: mY + r() * (bh - mY * 2) }
      let d = Infinity
      for (const p of pts) d = Math.min(d, (p.x - c.x) ** 2 + (p.y - c.y) ** 2)
      if (d > bestD) {
        bestD = d
        best = c
      }
    }
    pts.push(best)
  }
  return pts
}

function build(animate) {
  vw = innerWidth
  vh = innerHeight
  bw = Math.max(vw * 2.3, 2200)
  bh = Math.max(vh * 2.3, 1600)
  stage.innerHTML = ""
  prints = []

  const works = shuffled(WORKS, 11)
  const r = rng(7)
  const spots = scatter(works.length, r)
  const base = Math.min(vw, vh)

  works.forEach((work, i) => {
    const depth = 0.8 + r() * 0.4 // parallax rate; faster = closer
    const spot = document.createElement("div")
    spot.className = "spot"
    spot.style.setProperty("--z", 1 + Math.round(depth * 40))

    let w = base * (0.24 + r() * 0.17)
    if (work.ratio < 1) w *= 0.68 // portraits narrower
    if (work.ratio > 2.4) w *= 1.55 // the roomp panorama likes room
    w *= 0.82 + depth * 0.18 // closer prints a touch larger

    const rot = (r() * 2 - 1) * 13
    const print = document.createElement("div")
    print.className = "print"
    print.style.width = w + "px"
    print.style.setProperty("--rot", rot.toFixed(2) + "deg")
    print.style.setProperty("--ar", work.ratio.toFixed(4))
    print.appendChild(workImage(work))
    spot.appendChild(print)
    stage.appendChild(spot)

    prints.push({ el: spot, x: spots[i].x, y: spots[i].y, depth })

    if (animate && !REDUCED) {
      // dealt from beyond the edges, along the print's own direction
      const cx = spots[i].x - bw / 2
      const cy = spots[i].y - bh / 2
      const len = Math.hypot(cx, cy) || 1
      const d = 420 + r() * 420
      print.animate(
        [
          {
            transform: `translate(${(cx / len) * d}px, ${(cy / len) * d}px) rotate(${(rot * 2.4).toFixed(1)}deg) scale(1.2)`,
            opacity: 0,
          },
          { transform: `rotate(${rot.toFixed(2)}deg)`, opacity: 1 },
        ],
        {
          duration: 950,
          delay: i * 42 + r() * 90,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "backwards",
        }
      )
    }
  })
}

function clampPan() {
  const limX = Math.max(0, (bw - vw) / 2 / 1.2 - 30)
  const limY = Math.max(0, (bh - vh) / 2 / 1.2 - 30)
  panX = Math.max(-limX, Math.min(limX, panX))
  panY = Math.max(-limY, Math.min(limY, panY))
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
  tmx = (e.clientX / vw) * 2 - 1
  tmy = (e.clientY / vh) * 2 - 1
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

const endDrag = () => {
  dragging = false
  stage.classList.remove("is-dragging")
}
stage.addEventListener("pointerup", endDrag)
stage.addEventListener("pointercancel", endDrag)

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
    const f = Math.pow(0.1, dt)
    velX *= f
    velY *= f
    if (idle > 5 && !REDUCED) {
      // lazy lissajous drift across the pile
      const ax = Math.sin(t * 0.1) * (bw - vw) * 0.26
      const ay = Math.cos(t * 0.077) * (bh - vh) * 0.26
      const k = Math.min(1, dt * 0.3)
      panX += (ax - panX) * k
      panY += (ay - panY) * k
    }
  }
  clampPan()

  const km = Math.min(1, dt * 4)
  mx += (tmx - mx) * km
  my += (tmy - my) * km

  const baseX = (vw - bw) / 2
  const baseY = (vh - bh) / 2
  for (const p of prints) {
    const d = p.depth
    const x = p.x + baseX + (panX - mx * 26) * d
    const y = p.y + baseY + (panY - my * 20) * d
    p.el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
  }

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build(false)
  }, 220)
})

mountNav(1)
onViewport(() => {
  build(true)
  prev = performance.now()
  requestAnimationFrame(frame)
})
