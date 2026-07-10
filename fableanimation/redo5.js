// Izkliede: a black field with small white redo marks adrift, after the
// scattered-typography reference — tiny logos float like dust, and a few
// repeating ticker blocks slide through, radio-programme style. Pure DOM:
// the svg stays vector-crisp at any pixel ratio, no WebGL involved.

const MARKS = 16
const TICKERS = 4
// the whole field streams to the upper right, like the reference —
// wander and cursor pushes ride on top of this current
const FLOW_X = 26 // px/s
const FLOW_Y = -16
const TICKER_TEXT =
  "FABLE ANIMATION — IZKLIEDE #007<br>&rarr; REDO BUREAU &nbsp;&bull;&nbsp; LIQUID SERIES 001&ndash;007"

const field = document.getElementById("field")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720
window.addEventListener("resize", () => {
  width = window.innerWidth || width
  height = window.innerHeight || height
})

let cursorX = -1e4
let cursorY = -1e4
window.addEventListener("mousemove", e => {
  cursorX = e.clientX
  cursorY = e.clientY
})
window.addEventListener("mouseleave", () => {
  cursorX = -1e4
  cursorY = -1e4
})

const drifters = []

function rand(a, b) {
  return a + Math.random() * (b - a)
}

// slow wandering velocity that eases toward a new random heading now and then
function makeDrifter(el, w, h, speed, flow) {
  const d = {
    el, w, h,
    x: rand(0, width),
    y: rand(0, height),
    vx: rand(-speed, speed),
    vy: rand(-speed, speed),
    tx: rand(-speed, speed),
    ty: rand(-speed, speed),
    retarget: rand(2, 7),
    speed,
    flow // share of the common current — bigger marks ride it faster
  }
  drifters.push(d)
  return d
}

fetch("redo-logo.svg")
  .then(r => r.text())
  .then(svg => {
    for (let i = 0; i < MARKS; i++) {
      const el = document.createElement("div")
      el.className = "mark"
      el.innerHTML = svg
      const w = rand(24, 78)
      el.style.width = w + "px"
      el.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2)
      field.appendChild(el)
      makeDrifter(el, w, w * 0.25, rand(3, 8), 0.45 + (w / 78) * rand(0.7, 1.1))
    }

    for (let i = 0; i < TICKERS; i++) {
      const el = document.createElement("div")
      el.className = "ticker"
      el.innerHTML = TICKER_TEXT
      field.appendChild(el)
      // tickers ride the same current, a touch slower than the marks
      const d = makeDrifter(el, 320, 30, 0, rand(0.35, 0.55))
      d.vx = 0
      d.vy = 0
      d.ticker = true
      d.y = (height / (TICKERS + 1)) * (i + 1) + rand(-40, 40)
    }
  })

let last = performance.now()

function tick(now) {
  requestAnimationFrame(tick)
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now

  for (const d of drifters) {
    if (!d.ticker) {
      // ease toward the current heading, pick a new one when the timer runs out
      d.retarget -= dt
      if (d.retarget <= 0) {
        d.retarget = rand(2, 7)
        d.tx = rand(-d.speed, d.speed)
        d.ty = rand(-d.speed, d.speed)
      }
      d.vx += (d.tx - d.vx) * dt * 0.4
      d.vy += (d.ty - d.vy) * dt * 0.4

      // the cursor gently pushes marks away
      const dx = d.x + d.w / 2 - cursorX
      const dy = d.y + d.h / 2 - cursorY
      const dist = Math.hypot(dx, dy)
      if (dist < 140 && dist > 1) {
        const push = (1 - dist / 140) * 120 * dt
        d.x += (dx / dist) * push
        d.y += (dy / dist) * push
      }
    }

    d.x += (FLOW_X * d.flow + d.vx) * dt
    d.y += (FLOW_Y * d.flow + d.vy) * dt

    // torus wrap with a margin: leaving top-right, everything re-enters
    // from the bottom-left; tickers respawn at a fresh height, like the
    // reference blocks that keep reappearing somewhere else
    const m = 90
    if (d.x < -d.w - m) { d.x = width + m; if (d.ticker) d.y = rand(20, height - 60) }
    if (d.x > width + m) { d.x = -d.w - m; if (d.ticker) d.y = rand(20, height - 60) }
    if (d.y < -d.h - m) d.y = height + m
    if (d.y > height + m) d.y = -d.h - m

    d.el.style.transform = `translate(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px)`
  }
}

requestAnimationFrame(tick)

window.__fable = { drifters }
