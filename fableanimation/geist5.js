// Geist 005 Neons: a storefront sign after midnight. TOO and FOR ME burn
// steady pink; EXPENSIVE is the faulty tube — it stutters, browns out,
// drops single letters, slams back on. A wet floor doubles the sign below.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")
const stage = document.getElementById("stage")
let S = 600
let t = 0
let last = performance.now()
const letterState = new Array(9).fill(1)
let nextFlick = 1

function drawLine(text, y, fs, alpha, perLetter) {
  ctx.font = `700 ${fs}px Geist, sans-serif`
  ctx.textAlign = "left"
  let x = S * 0.08
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const a = alpha * (perLetter ? perLetter[i] : 1)
    if (a > 0.02) {
      ctx.shadowColor = `rgba(255,80,180,${a})`
      ctx.shadowBlur = fs * 0.45
      ctx.fillStyle = `rgba(255,190,225,${a})`
      ctx.fillText(ch, x, y)
      ctx.shadowBlur = fs * 0.18
      ctx.fillStyle = `rgba(255,240,250,${a})`
      ctx.fillText(ch, x, y)
    } else {
      ctx.shadowBlur = 0
      ctx.fillStyle = "rgba(120,60,90,0.25)"
      ctx.fillText(ch, x, y)
    }
    x += ctx.measureText(ch).width + fs * 0.02
  }
  ctx.shadowBlur = 0
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  t += dt
  if (stage.clientWidth !== S) { S = stage.clientWidth; canvas.width = S; canvas.height = S }

  // кирпичная тьма
  ctx.fillStyle = "#120a10"
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = "rgba(255,255,255,0.03)"
  ctx.lineWidth = 1
  const bh = S * 0.045
  for (let row = 0; row < S / bh; row++) {
    ctx.beginPath(); ctx.moveTo(0, row * bh); ctx.lineTo(S, row * bh); ctx.stroke()
    const off = row % 2 ? 0 : bh
    for (let x = off; x < S; x += bh * 2.2) {
      ctx.beginPath(); ctx.moveTo(x, row * bh); ctx.lineTo(x, (row + 1) * bh); ctx.stroke()
    }
  }

  // заикание EXPENSIVE
  if (t > nextFlick) {
    const mode = Math.random()
    if (mode < 0.35) letterState.fill(Math.random() < 0.5 ? 0.1 : 1)
    else if (mode < 0.8) letterState[(Math.random() * 9) | 0] = Math.random() < 0.6 ? 0.05 : 1
    else letterState.fill(1)
    nextFlick = t + 0.08 + Math.random() * 0.7
  }
  // медленно восстанавливаются
  for (let i = 0; i < 9; i++) letterState[i] += (1 - letterState[i]) * dt * 1.5

  const fs = S * 0.125
  const hum = 0.92 + 0.08 * Math.sin(t * 60)
  drawLine("TOO", S * 0.24, fs, 0.95 * hum)
  drawLine("EXPENSIVE", S * 0.44, fs, 0.95, letterState)
  drawLine("FOR ME", S * 0.64, fs, 0.95 * hum)

  // мокрый пол: отражение
  ctx.save()
  ctx.translate(0, S * 1.42)
  ctx.scale(1, -1)
  ctx.globalAlpha = 0.16
  drawLine("TOO", S * 0.24, fs, 0.9)
  drawLine("EXPENSIVE", S * 0.44, fs, 0.9, letterState)
  drawLine("FOR ME", S * 0.64, fs, 0.9)
  ctx.restore()
  const grad = ctx.createLinearGradient(0, S * 0.72, 0, S)
  grad.addColorStop(0, "rgba(18,10,16,0)")
  grad.addColorStop(1, "rgba(18,10,16,0.9)")
  ctx.fillStyle = grad
  ctx.fillRect(0, S * 0.72, S, S * 0.28)
}
requestAnimationFrame(frame)
window.__fable = { get t() { return t }, set t(v) { t = v } }
