// Geist 004 Inflacija: the price inflates. EXPENSIVE swells — scale and
// weight climbing together — squeezing TOO and FOR ME against the edges of
// the square, until it bursts: the letters blow apart, drift, and the word
// deflates back to sanity. Inflation in one breath.

const mid = document.getElementById("mid")
const top_ = document.getElementById("top")
const bot = document.getElementById("bot")
const spans = mid.querySelectorAll("span")
const scatter = []
for (let i = 0; i < spans.length; i++) {
  scatter.push({ dx: (Math.random() - 0.5) * 60, dy: (Math.random() - 0.5) * 50, r: (Math.random() - 0.5) * 70 })
}
let t = 0
let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  t += dt
  const CYC = 7
  const c = t % CYC
  let inflate, pop = 0
  if (c < 3.6) inflate = Math.pow(c / 3.6, 1.6)
  else if (c < 4.0) { inflate = 1; pop = (c - 3.6) / 0.4 }
  else if (c < 5.2) { inflate = 1 - (c - 4.0) / 1.2; pop = Math.max(0, 1 - (c - 4.0) / 0.8) }
  else inflate = 0
  const wob = 1 + Math.sin(t * 14) * 0.012 * inflate
  const sc = (1 + inflate * 1.45) * wob
  const w = Math.round(300 + inflate * 600)
  mid.style.transform = `translateX(-50%) scale(${sc.toFixed(3)})`
  mid.style.fontVariationSettings = `"wght" ${w}`
  top_.style.transform = `translateX(-50%) translateY(${(-inflate * 90).toFixed(1)}%)`
  bot.style.transform = `translateX(-50%) translateY(${(inflate * 90).toFixed(1)}%)`
  for (let i = 0; i < spans.length; i++) {
    const s = scatter[i]
    const k = pop
    spans[i].style.transform = `translate(${(s.dx * k).toFixed(1)}px, ${(s.dy * k).toFixed(1)}px) rotate(${(s.r * k).toFixed(1)}deg)`
    spans[i].style.opacity = (1 - k * 0.3).toFixed(2)
  }
}
requestAnimationFrame(frame)
window.__fable = { get t() { return t }, set t(v) { t = v } }
