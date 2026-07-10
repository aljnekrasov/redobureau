// Pulksteņi: five station clocks hanging from the ceiling on twin steel
// rods, after the photo reference — rounded-square bezels, cream faces,
// bar markers with 12/3/6/9 numerals, black bar hands. Each one keeps the
// real time of its city and sways almost imperceptibly on its rods.

const CITIES = [
  { name: "Dubai", tz: "Asia/Dubai", rod: 150 },
  { name: "Madrid", tz: "Europe/Madrid", rod: 70 },
  { name: "Buenos Aires", tz: "America/Argentina/Buenos_Aires", rod: 215 },
  { name: "New York", tz: "America/New_York", rod: 110 },
  { name: "California", tz: "America/Los_Angeles", rod: 180 }
]

const hall = document.getElementById("hall")

function clockSvg(i, rod) {
  const W = 220
  const cx = W / 2
  const top = 12
  const cy = top + rod + 100
  const H = cy + 100 + 8

  // face markers: dots each minute, bars each hour, numerals at the quarters
  let marks = ""
  for (let m = 0; m < 60; m++) {
    const a = (m / 60) * Math.PI * 2
    if (m % 5) {
      const x = Math.sin(a) * 80
      const y = -Math.cos(a) * 80
      marks += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.7" fill="#1c1b19"/>`
    } else if (m % 15) {
      const deg = (m / 60) * 360
      marks += `<rect x="-2.4" y="-81" width="4.8" height="16" fill="#1c1b19" transform="rotate(${deg})"/>`
    }
  }
  const numerals = `
    <g fill="#1c1b19" font-family="'Space Grotesk', Helvetica, sans-serif"
       font-size="27" font-weight="500" text-anchor="middle">
      <text x="0" y="-51">12</text>
      <text x="60" y="9.5">3</text>
      <text x="0" y="70">6</text>
      <text x="-60" y="9.5">9</text>
    </g>`

  return `
  <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rod${i}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#8f8e8c"/>
        <stop offset="0.35" stop-color="#cfcecb"/>
        <stop offset="0.65" stop-color="#b3b2af"/>
        <stop offset="1" stop-color="#807f7d"/>
      </linearGradient>
      <linearGradient id="bez${i}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d9d8d5"/>
        <stop offset="0.5" stop-color="#a7a6a3"/>
        <stop offset="1" stop-color="#8b8a88"/>
      </linearGradient>
    </defs>

    <rect x="${cx - 56}" y="2" width="112" height="10" rx="2" fill="url(#bez${i})"/>
    <rect x="${cx - 33}" y="${top}" width="8" height="${rod + 6}" fill="url(#rod${i})"/>
    <rect x="${cx + 25}" y="${top}" width="8" height="${rod + 6}" fill="url(#rod${i})"/>
    <rect x="${cx - 40}" y="${top}" width="22" height="9" rx="3" fill="url(#bez${i})"/>
    <rect x="${cx + 18}" y="${top}" width="22" height="9" rx="3" fill="url(#bez${i})"/>

    <g transform="translate(${cx}, ${cy})">
      <rect x="-100" y="-100" width="200" height="200" rx="38" fill="url(#bez${i})"/>
      <rect x="-93" y="-93" width="186" height="186" rx="33" fill="#eceadb"/>
      ${marks}
      ${numerals}
      <g class="hand-h"><rect x="-3.6" y="-56" width="7.2" height="70" fill="#171614"/></g>
      <g class="hand-m"><rect x="-2.7" y="-78" width="5.4" height="94" fill="#171614"/></g>
      <g class="hand-s"><rect x="-0.9" y="-82" width="1.8" height="102" fill="#171614"/></g>
      <circle r="4.6" fill="#171614"/>
    </g>
  </svg>`
}

const units = []

CITIES.forEach((c, i) => {
  const el = document.createElement("div")
  el.className = "unit"
  el.innerHTML = clockSvg(i, c.rod) + `<div class="city">${c.name}</div>`
  hall.appendChild(el)
  units.push({
    el,
    tz: c.tz,
    offset: 0,
    hour: el.querySelector(".hand-h"),
    min: el.querySelector(".hand-m"),
    sec: el.querySelector(".hand-s"),
    swayW: 0.5 + Math.random() * 0.5,
    swayP: Math.random() * Math.PI * 2
  })
})

// timezone offsets, refreshed once a minute — between refreshes the hands
// run off the shared local clock, so five Intl parses per frame are avoided
function refreshOffsets() {
  const now = new Date()
  for (const u of units) {
    const local = new Date(now.toLocaleString("en-US", { timeZone: u.tz }))
    u.offset = local - now
  }
}
refreshOffsets()
setInterval(refreshOffsets, 60000)

function tick(nowMs) {
  requestAnimationFrame(tick)
  const t = nowMs / 1000

  for (const u of units) {
    const d = new Date(Date.now() + u.offset)
    const s = d.getSeconds()
    const m = d.getMinutes() + s / 60
    const h = (d.getHours() % 12) + m / 60

    u.hour.setAttribute("transform", `rotate(${(h * 30).toFixed(2)})`)
    u.min.setAttribute("transform", `rotate(${(m * 6).toFixed(2)})`)
    // station clocks jump the second hand with a soft settle
    const frac = (Date.now() + u.offset) % 1000 / 1000
    const settle = Math.min(frac * 5, 1)
    u.sec.setAttribute("transform", `rotate(${(((s - 1 + settle) % 60) * 6).toFixed(2)})`)

    u.el.style.transform = `rotate(${(Math.sin(t * u.swayW + u.swayP) * 0.7).toFixed(3)}deg)`
  }
}

requestAnimationFrame(tick)

window.__fable = { units }
