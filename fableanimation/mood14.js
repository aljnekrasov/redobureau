import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Atbalss 043 — experimental, reworked. Video feedback: the canvas is
// redrawn onto itself a touch larger and rotated every frame, so the
// current work spirals outward into an endless tunnel of echoes.
//
// The first cut blended additively ('lighter') with a weak fade, so energy
// piled up with no ceiling and the whole screen slowly clipped to white.
// This one composites NORMALLY (source-over): every pixel is a weighted
// average of the photograph and the fading echoes, so brightness can never
// exceed the work itself — the tunnel stays deep and dark forever, no
// white-out. A radial vignette (which only darkens) frames the mouth.
//
// Cursor steers the vanishing point; click flips the zoom between racing
// outward and falling inward; the works cross-fade on their own.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

// where the fresh work is stamped each frame
const stamp = document.createElement("canvas")
const stx = stamp.getContext("2d")

let vw = 0
let vh = 0
let imgs = []
let order = []
let cur = 0
let fade = 0
let hold = 0

let cx = 0
let cy = 0
let tcx = 0
let tcy = 0
let t = 0
let dir = 1 // eased zoom direction: +1 outward, −1 inward
let tdir = 1

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  const sw = Math.round(Math.min(vw, vh) * 0.5)
  stamp.width = sw
  stamp.height = Math.round(sw * 0.68)
  cx = tcx = vw / 2
  cy = tcy = vh / 2
  ctx.fillStyle = "#060608"
  ctx.fillRect(0, 0, vw, vh)
}

function stampWork() {
  const a = imgs[order[cur]]
  const b = imgs[order[(cur + 1) % order.length]]
  stx.globalAlpha = 1
  if (a && a.naturalWidth) coverDraw(stx, a, 0, 0, stamp.width, stamp.height)
  if (fade > 0 && b && b.naturalWidth) {
    stx.globalAlpha = fade
    coverDraw(stx, b, 0, 0, stamp.width, stamp.height)
    stx.globalAlpha = 1
  }
}

addEventListener("pointermove", e => {
  tcx = e.clientX
  tcy = e.clientY
})
addEventListener("pointerdown", () => {
  tdir = -tdir // click reverses the tunnel: outward ⇄ inward
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt

  // cross-fade the source work
  if (!REDUCED) {
    if (fade === 0) {
      hold += dt
      if (hold > 2.6) {
        hold = 0
        fade = 0.0001
      }
    } else {
      fade = Math.min(1, fade + dt / 1.0)
      if (fade >= 1) {
        fade = 0
        cur = (cur + 1) % order.length
      }
    }
  }

  cx += (tcx - cx) * Math.min(1, dt * 2.5)
  cy += (tcy - cy) * Math.min(1, dt * 2.5)
  dir += (tdir - dir) * Math.min(1, dt * 2)

  // FEEDBACK — source-over, so it is a contraction: the result is always a
  // blend of existing pixels and can never brighten past its inputs. That is
  // the whole fix for the white-out.
  const grow = REDUCED ? 1 : 1 + 0.034 * dir // >1 outward, <1 inward
  const rot = REDUCED ? 0 : (0.06 * dt + 0.004) * dir
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(grow, grow)
  ctx.rotate(rot)
  ctx.translate(-cx, -cy)
  ctx.globalAlpha = 0.93 // 7%/frame fade keeps the echoes crisp
  ctx.drawImage(canvas, 0, 0)
  ctx.restore()
  ctx.globalAlpha = 1

  // stamp the fresh work at the mouth (normal blend → melts into the stream)
  stampWork()
  const sw = Math.min(vw, vh) * 0.42
  const sh = sw * 0.68
  const bob = Math.sin(t * 0.6) * sw * 0.015
  ctx.globalAlpha = 0.72
  ctx.drawImage(stamp, cx - sw / 2, cy - sh / 2 + bob, sw, sh)
  ctx.globalAlpha = 1

  // vignette frames the tunnel and eats its faded rim — pure darkening,
  // so it can only ever pull brightness down
  const g = ctx.createRadialGradient(
    vw / 2,
    vh / 2,
    Math.min(vw, vh) * 0.16,
    vw / 2,
    vh / 2,
    Math.max(vw, vh) * 0.72
  )
  g.addColorStop(0, "rgba(6,6,8,0)")
  g.addColorStop(1, "rgba(6,6,8,0.92)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, vw, vh)

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(14)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 23).map(w => WORKS.indexOf(w))
  prev = performance.now()
  requestAnimationFrame(frame)
})
