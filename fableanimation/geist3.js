// Geist 003 Ceks: a receipt printer feeds the verdict line by line — the
// paper stutters out of the slot, TOO EXPENSIVE FOR ME prints as the total,
// the perforation tears, and the receipt drops away. Then the next customer.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")
const stage = document.getElementById("stage")
let S = 600
let t = 0
let last = performance.now()

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  t += dt
  if (stage.clientWidth !== S) { S = stage.clientWidth; canvas.width = S; canvas.height = S }

  ctx.fillStyle = "#b8b6b2"
  ctx.fillRect(0, 0, S, S)
  // слот принтера
  ctx.fillStyle = "#57544e"
  ctx.fillRect(S * 0.08, 0, S * 0.84, S * 0.045)
  ctx.fillStyle = "#2e2c28"
  ctx.fillRect(S * 0.10, S * 0.028, S * 0.80, S * 0.012)

  const CYC = 12
  const c = t % CYC
  const paperW = S * 0.72
  const px = (S - paperW) / 2

  // высота выползшей ленты: печать шагами
  let feed
  const stepDur = 0.55
  const steps = Math.min(11, Math.floor(c / stepDur))
  const inStep = Math.min(1, (c - steps * stepDur) / 0.18)
  feed = (steps + inStep) * S * 0.068
  let drop = 0, rot = 0
  if (c > 9.2) {
    const k = (c - 9.2) / 1.4
    drop = Math.pow(k, 2) * S * 1.4
    rot = k * 0.35
  }
  if (c > 9.2 + 1.4) { feed = 0 }

  const paperH = Math.min(feed, S * 0.75)
  ctx.save()
  ctx.translate(S / 2, S * 0.03 + drop)
  ctx.rotate(rot)
  ctx.translate(-S / 2, -S * 0.03)
  // бумага
  ctx.fillStyle = "#faf8f2"
  ctx.fillRect(px, S * 0.03, paperW, paperH)
  ctx.strokeStyle = "rgba(0,0,0,0.08)"
  ctx.strokeRect(px, S * 0.03, paperW, paperH)

  // содержимое чека — печатается по мере фида
  ctx.save()
  ctx.beginPath()
  ctx.rect(px, S * 0.03, paperW, paperH)
  ctx.clip()
  const baseY = S * 0.03
  ctx.fillStyle = "#1c1a17"
  ctx.textAlign = "center"
  const cx = S / 2
  ctx.font = `500 ${S * 0.028}px Geist, sans-serif`
  ctx.fillText("REDO STORE", cx, baseY + S * 0.075)
  ctx.font = `400 ${S * 0.02}px Geist, sans-serif`
  ctx.fillText("2026-08-18  ·  18:42", cx, baseY + S * 0.105)
  ctx.fillText("................................................", cx, baseY + S * 0.135)
  ctx.textAlign = "left"
  ctx.font = `400 ${S * 0.024}px Geist, sans-serif`
  ctx.fillText("DREAM  × 1", px + S * 0.05, baseY + S * 0.175)
  ctx.textAlign = "right"
  ctx.fillText("∞", px + paperW - S * 0.05, baseY + S * 0.175)
  ctx.textAlign = "center"
  ctx.fillText("................................................", cx, baseY + S * 0.205)
  // вердикт
  ctx.textAlign = "left"
  ctx.font = `800 ${S * 0.085}px Geist, sans-serif`
  ctx.fillText("TOO", px + S * 0.05, baseY + S * 0.30)
  ctx.fillText("EXPENSIVE", px + S * 0.05, baseY + S * 0.395)
  ctx.fillText("FOR ME", px + S * 0.05, baseY + S * 0.49)
  ctx.font = `400 ${S * 0.02}px Geist, sans-serif`
  ctx.textAlign = "center"
  ctx.fillText("THANK YOU  ·  COME NEVER AGAIN", cx, baseY + S * 0.56)
  // перфорация
  ctx.setLineDash([S * 0.012, S * 0.012])
  ctx.strokeStyle = "rgba(0,0,0,0.35)"
  ctx.beginPath()
  ctx.moveTo(px, baseY + S * 0.60)
  ctx.lineTo(px + paperW, baseY + S * 0.60)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
  ctx.restore()

  // головка печати мигает при шаге
  if (inStep < 1 && c < 9) {
    ctx.fillStyle = "rgba(255,80,60,0.9)"
    ctx.beginPath()
    ctx.arc(S * 0.89, S * 0.022, S * 0.008, 0, Math.PI * 2)
    ctx.fill()
  }
}
requestAnimationFrame(frame)
window.__fable = { get t() { return t }, set t(v) { t = v } }
