// Zīme: the redo logotype bent from real neon tubing. Every path of the
// logo svg becomes one glass tube on a dark wall: a bright core, an amber
// halo, bloom on the plaster behind. The sign starts up the way neon does —
// tubes ignite left to right with a stutter — then it hums: brightness
// buzzes a few percent, and every now and then one tube drops out, blinks,
// and catches again. Pure canvas 2d, no dependencies.

const TUBE_W = 17 // glass width in svg units
const VIEW = { x: 79.6, y: 765.86, w: 1840.49, h: 468.42 }
const AMBER = { r: 255, g: 158, b: 36 }
const CORE = "#fff6dd"

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0
let mouseY = 0
let lastClientX = null
let lastClientY = null
let energy = 0

// -- tubes from the svg ---------------------------------------------------------------

const tubes = [] // { path, sortX, t0, dropUntil, nextDrop, seed }

fetch("redo-logo.svg")
  .then(r => r.text())
  .then(svg => {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml")

    for (const el of doc.querySelectorAll("path")) {
      const d = el.getAttribute("d")
      const mx = parseFloat((d.match(/M\s*([\d.]+)/) || [0, VIEW.x])[1])
      tubes.push({ path: new Path2D(d), sortX: mx })
    }
    for (const el of doc.querySelectorAll("circle")) {
      const cx = parseFloat(el.getAttribute("cx"))
      const cy = parseFloat(el.getAttribute("cy"))
      const r = parseFloat(el.getAttribute("r"))
      const p = new Path2D()
      p.arc(cx, cy, r, 0, Math.PI * 2)
      tubes.push({ path: p, sortX: cx })
    }

    tubes.sort((a, b) => a.sortX - b.sortX)
    tubes.forEach((tube, i) => {
      tube.seed = Math.random() * 100
      // staggered ignition, left to right, with a little jitter
      tube.t0 = 0.5 + i * 0.22 + Math.random() * 0.15
      tube.dropUntil = 0
      tube.nextDrop = 4 + Math.random() * 7
    })
  })

// -- envelope -------------------------------------------------------------------------

// neon startup: dead, then a burst of stutter, then steady hum
function intensity(tube, t) {
  if (t < tube.t0) return 0

  const since = t - tube.t0
  if (since < 0.55) {
    // stutter: pseudo-random square wave that settles
    const q = Math.sin(since * 61 + tube.seed) * Math.sin(since * 23 + tube.seed * 3)
    return q > -0.2 ? 0.55 + since * 0.6 : 0.04
  }

  // occasional dropout: the tube dies for a blink and catches again
  if (t > tube.nextDrop && t < tube.nextDrop + 0.5) {
    const phase = t - tube.nextDrop
    if (phase < 0.14) return 0.03
    if (phase < 0.2) return 0.8
    if (phase < 0.3) return 0.05
  } else if (t >= tube.nextDrop + 0.5) {
    tube.nextDrop = t + 6 + Math.random() * 12
  }

  // steady hum, a few percent of buzz
  const buzz =
    0.965 +
    0.025 * Math.sin(t * 57 + tube.seed * 13) * Math.sin(t * 31 + tube.seed) +
    0.01 * Math.sin(t * 240 + tube.seed * 7)
  return buzz * (1 + energy * 0.12)
}

// -- sizing ---------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  // dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
  canvas.width = width
  canvas.height = height
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction ----------------------------------------------------------------------

window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 2
  mouseY = (e.clientY / height - 0.5) * 2
  if (lastClientX !== null) {
    const speed =
      Math.hypot(e.clientX - lastClientX, e.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 5, 1.2)
  }
  lastClientX = e.clientX
  lastClientY = e.clientY
})

// -- loop -----------------------------------------------------------------------------

let start = performance.now()
let last = start

function amber(alpha) {
  return `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${alpha})`
}

function draw(now) {
  requestAnimationFrame(draw)
  const t = (now - start) / 1000
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  energy *= Math.pow(0.3, dt)

  // plaster wall with a soft pool of light behind the sign
  const wallGrad = ctx.createRadialGradient(
    width / 2 - mouseX * 14, height / 2 - mouseY * 10, height * 0.06,
    width / 2, height / 2, height * 0.85
  )
  let lit = 0
  for (const tube of tubes) lit += Math.min(intensity(tube, t), 1)
  const wallLift = tubes.length ? (lit / tubes.length) * 0.5 : 0
  wallGrad.addColorStop(0, `rgb(${34 + 26 * wallLift}, ${30 + 19 * wallLift}, ${25 + 11 * wallLift})`)
  wallGrad.addColorStop(1, "#0d0c0b")
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.fillStyle = wallGrad
  ctx.fillRect(0, 0, width, height)

  if (!tubes.length) return

  // fit the sign to ~72% of the viewport width, parallax against the wall
  const s = Math.min((width * 0.72) / VIEW.w, (height * 0.6) / VIEW.h)
  const tx = width / 2 - (VIEW.x + VIEW.w / 2) * s + mouseX * 9
  const ty = height / 2 - (VIEW.y + VIEW.h / 2) * s + mouseY * 6
  ctx.setTransform(s, 0, 0, s, tx, ty)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  for (const tube of tubes) {
    const I = Math.min(intensity(tube, t), 1.3)

    // the glass itself — visible even when the gas is dark
    ctx.shadowBlur = 0
    ctx.strokeStyle = `rgba(70, 52, 34, ${0.55 - 0.3 * I})`
    ctx.lineWidth = TUBE_W
    ctx.stroke(tube.path)

    if (I < 0.05) continue

    // wide bloom on the wall
    ctx.shadowColor = amber(0.9 * I)
    ctx.shadowBlur = 46 * s * 10
    ctx.strokeStyle = amber(0.32 * I)
    ctx.lineWidth = TUBE_W * 0.9
    ctx.stroke(tube.path)

    // tight halo hugging the glass
    ctx.shadowBlur = 14 * s * 10
    ctx.strokeStyle = amber(0.55 * I)
    ctx.lineWidth = TUBE_W * 0.72
    ctx.stroke(tube.path)

    // the burning core
    ctx.shadowBlur = 6 * s * 10
    ctx.shadowColor = amber(0.9 * I)
    ctx.strokeStyle = `rgba(255, 246, 221, ${Math.min(I, 1)})`
    ctx.lineWidth = TUBE_W * 0.34
    ctx.stroke(tube.path)
  }
}

requestAnimationFrame(draw)

window.__fable = { tubes, canvas, get time() { return (performance.now() - start) / 1000 } }
