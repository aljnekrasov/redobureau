// Geist 002 Monetas: the statement minted in gold coins. Every few seconds
// the words lose their grip, the coins pour down and heap on the floor of
// the square, then fly back up and re-mint the sentence.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")
const stage = document.getElementById("stage")

let S = 600
const LINES = ["TOO", "EXPENSIVE", "FOR ME"]
let coins = []
let built = false

function build() {
  S = stage.clientWidth
  canvas.width = S; canvas.height = S
  const off = document.createElement("canvas")
  off.width = S; off.height = S
  const g = off.getContext("2d")
  g.fillStyle = "#fff"
  g.textBaseline = "middle"
  const fs = S * 0.148
  g.font = `800 ${fs}px Geist, sans-serif`
  const ys = [S * 0.22, S * 0.48, S * 0.74]
  for (let i = 0; i < 3; i++) g.fillText(LINES[i], S * 0.07, ys[i])
  const data = g.getImageData(0, 0, S, S).data
  coins = []
  const step = Math.max(5, Math.round(S / 110))
  for (let y = 0; y < S; y += step) for (let x = 0; x < S; x += step) {
    if (data[(y * S + x) * 4 + 3] > 128) {
      coins.push({
        hx: x, hy: y, x, y,
        vx: 0, vy: 0,
        r: step * (0.38 + Math.random() * 0.14),
        ph: Math.random() * 6.28,
        rest: S - step * (0.5 + Math.random() * 6)   // куда падает
      })
    }
  }
  built = true
}

let t = 0
let last = performance.now()

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  t += dt
  if (!built || stage.clientWidth !== S) {
    if (document.fonts.status === "loaded") build()
    else document.fonts.load("800 100px Geist").then(build)
  }
  ctx.fillStyle = "#0d2618"
  ctx.fillRect(0, 0, S, S)
  if (!coins.length) return

  const CYC = 10
  const c = t % CYC
  // 0..5 слово; 5..7 осыпается; 7..10 собирается
  for (const p of coins) {
    if (c < 5) {
      p.x += (p.hx - p.x) * Math.min(1, dt * 8)
      p.y += (p.hy - p.y) * Math.min(1, dt * 8)
      p.vx = 0; p.vy = 0
    } else if (c < 7.2) {
      const delay = (p.hx / S) * 0.8 + (p.hy / S) * 0.4
      if (c - 5 > delay) {
        p.vy += S * 1.6 * dt
        p.x += p.vx * dt; p.y += p.vy * dt
        if (p.y > p.rest) { p.y = p.rest; p.vy *= -0.35; p.vx = (Math.random() - 0.5) * S * 0.15 }
      }
    } else {
      p.x += (p.hx - p.x) * Math.min(1, dt * 3.2)
      p.y += (p.hy - p.y) * Math.min(1, dt * 3.2)
    }
    // монета с бликом
    const tw = 0.85 + 0.15 * Math.sin(t * 5 + p.ph)
    ctx.fillStyle = `rgba(242,193,78,${tw})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(255,240,200,0.7)"
    ctx.beginPath()
    ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.28, 0, Math.PI * 2)
    ctx.fill()
  }
}
requestAnimationFrame(frame)
window.__fable = { get t() { return t }, set t(v) { t = v } }
