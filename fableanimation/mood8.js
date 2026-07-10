import { WORKS, REDUCED, rng, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Peldēšana 037: thirty works adrift in a tank. Each keeps a slow, aimless
// heading and bobs on its own little current; nudge the water with the
// cursor and the nearby ones scatter, then ease back into their wander.
// They pass over and under each other, never quite still.

const tank = document.getElementById("tank")

let vw = innerWidth
let vh = innerHeight
let mx = -1e5
let my = -1e5
let t = 0

let fish = []

function build() {
  vw = innerWidth
  vh = innerHeight
  tank.innerHTML = ""
  fish = []
  const works = shuffled(WORKS, 8)
  const r = rng(61)
  const base = Math.min(vw, vh)

  works.forEach((work, i) => {
    let w = base * (0.15 + r() * 0.1)
    if (work.ratio > 2.2) w *= 1.5
    const h = w / work.ratio
    const el = document.createElement("div")
    el.className = "fish"
    el.style.width = w + "px"
    el.style.height = h + "px"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    el.appendChild(img)
    tank.appendChild(el)

    const ang = r() * Math.PI * 2
    const spd = 10 + r() * 18
    fish.push({
      el,
      w,
      h,
      x: w / 2 + r() * (vw - w),
      y: h / 2 + r() * (vh - h),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      ph: r() * Math.PI * 2, // bob phase
      pr: 0.6 + r() * 0.8, // bob rate
      rot: (r() * 2 - 1) * 4,
      z: Math.floor(r() * 30),
    })
    el.style.zIndex = fish[i].z
  })
}

tank.addEventListener("pointermove", e => {
  mx = e.clientX
  my = e.clientY
})
tank.addEventListener("pointerleave", () => {
  mx = my = -1e5
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt
  const slow = REDUCED ? 0.25 : 1

  for (const f of fish) {
    // aimless drift + a slow turn so headings keep changing
    const turn = Math.sin(t * 0.3 + f.ph) * 0.4
    const c = Math.cos(turn * dt)
    const s = Math.sin(turn * dt)
    const nvx = f.vx * c - f.vy * s
    const nvy = f.vx * s + f.vy * c
    f.vx = nvx
    f.vy = nvy

    // cursor pushes the water
    const dx = f.x - mx
    const dy = f.y - my
    const d2 = dx * dx + dy * dy
    const R = 190
    if (d2 < R * R) {
      const d = Math.sqrt(d2) || 1
      const push = (1 - d / R) * 520
      f.vx += (dx / d) * push * dt
      f.vy += (dy / d) * push * dt
    }

    // clamp speed so nudges settle
    const sp = Math.hypot(f.vx, f.vy)
    const max = 90
    if (sp > max) {
      f.vx = (f.vx / sp) * max
      f.vy = (f.vy / sp) * max
    }

    f.x += f.vx * dt * slow
    f.y += f.vy * dt * slow

    // soft walls
    const mX = f.w / 2
    const mY = f.h / 2
    if (f.x < mX) {
      f.x = mX
      f.vx = Math.abs(f.vx)
    } else if (f.x > vw - mX) {
      f.x = vw - mX
      f.vx = -Math.abs(f.vx)
    }
    if (f.y < mY) {
      f.y = mY
      f.vy = Math.abs(f.vy)
    } else if (f.y > vh - mY) {
      f.y = vh - mY
      f.vy = -Math.abs(f.vy)
    }

    const bob = Math.sin(t * f.pr + f.ph) * 6
    const tilt = f.rot + f.vx * 0.03
    f.el.style.transform = `translate3d(${(f.x - f.w / 2).toFixed(1)}px, ${(f.y - f.h / 2 + bob).toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`
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

mountNav(8)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
