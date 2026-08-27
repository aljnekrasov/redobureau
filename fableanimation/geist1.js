// Geist 001 Svars: the three lines breathe through the variable weight axis
// in sequence — TOO, then EXPENSIVE, then FOR ME swelling from hairline to
// black, the middle word also crushing its tracking as it fattens. The
// heartbeat of a price you keep re-reading.

const lines = [document.getElementById("l0"), document.getElementById("l1"), document.getElementById("l2")]
let t = 0
let last = performance.now()

function pulse(x) {
  const p = ((x % 3) + 3) % 3
  if (p > 1.2) return 0
  const k = p / 1.2
  return Math.pow(Math.sin(k * Math.PI), 1.4)
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  t += dt
  for (let i = 0; i < 3; i++) {
    const k = pulse(t * 0.9 - i * 0.55)
    const w = Math.round(100 + 800 * k)
    lines[i].style.fontVariationSettings = `"wght" ${w}`
    if (i === 1) lines[i].style.letterSpacing = `${(-0.02 - 0.045 * k).toFixed(3)}em`
  }
}
requestAnimationFrame(frame)
window.__fable = { get t() { return t }, set t(v) { t = v } }
