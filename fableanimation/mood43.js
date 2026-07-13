import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Ekrans 072 — experimental. Channel-surfing the portfolio on an old tube
// TV: barrel-bent glass, scanlines, a slow bright band rolling up the
// picture, phosphor stripes — and between works a burst of white-noise
// static with the picture tearing sideways. Click to zap to the next
// channel; it flips through on its own otherwise.

const canvas = document.getElementById("gl")
const gl = canvas.getContext("webgl", { antialias: true, alpha: false })

const VS = `attribute vec2 p; varying vec2 uv;
void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }`

const FS = `
precision highp float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec2 res;
uniform float time;
uniform float staticAmt;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  // barrel-bend the glass
  vec2 c = uv - 0.5;
  vec2 bent = uv + c * dot(c, c) * 0.22;
  // bezel outside the tube
  if (bent.x < 0.0 || bent.x > 1.0 || bent.y < 0.0 || bent.y > 1.0) {
    gl_FragColor = vec4(0.01, 0.01, 0.012, 1.0);
    return;
  }
  vec2 st = vec2(bent.x, 1.0 - bent.y);
  // horizontal tearing during static
  float row = floor(st.y * 120.0);
  st.x += (hash(vec2(row, floor(time * 24.0))) - 0.5) * 0.14 * staticAmt;

  vec3 col = texture2D(tex, st).rgb;

  // white-noise burst
  float n = hash(floor(st * res * 0.5) + floor(time * 60.0));
  col = mix(col, vec3(n), clamp(staticAmt, 0.0, 1.0) * 0.92);

  // rolling bright band
  float band = smoothstep(0.35, 0.0, abs(fract(bent.y + time * 0.11) - 0.5) - 0.12);
  col *= 1.0 + band * 0.055;
  // scanlines + phosphor stripes
  col *= 0.86 + 0.14 * sin(bent.y * res.y * 3.14159);
  float stripe = mod(gl_FragCoord.x, 3.0);
  col *= vec3(stripe < 1.0 ? 1.04 : 1.0, stripe >= 1.0 && stripe < 2.0 ? 1.04 : 1.0, stripe >= 2.0 ? 1.04 : 1.0);
  // corner shading of the tube
  float vig = smoothstep(1.05, 0.4, length(c) * 1.5);
  gl_FragColor = vec4(col * vig, 1.0);
}`

function compile(type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
  return sh
}
const prog = gl.createProgram()
gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS))
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS))
gl.linkProgram(prog)
gl.useProgram(prog)

const buf = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buf)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
const loc = gl.getAttribLocation(prog, "p")
gl.enableVertexAttribArray(loc)
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

const uRes = gl.getUniformLocation(prog, "res")
const uTime = gl.getUniformLocation(prog, "time")
const uStatic = gl.getUniformLocation(prog, "staticAmt")

const tex = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, tex)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

const cover = document.createElement("canvas")
const cctx = cover.getContext("2d")

let vw = 0
let vh = 0
let imgs = []
let order = []
let cur = 0
let staticAmt = 0
let switching = false
let hold = 0
let t = 0

function uploadWork(pos) {
  const img = imgs[order[((pos % order.length) + order.length) % order.length]]
  cctx.fillStyle = "#000"
  cctx.fillRect(0, 0, cover.width, cover.height)
  if (img && img.naturalWidth) coverDraw(cctx, img, 0, 0, cover.width, cover.height)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cover)
}

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  gl.viewport(0, 0, vw, vh)
  cover.width = Math.min(1400, vw)
  cover.height = Math.round(cover.width * (vh / vw))
  if (imgs.length) uploadWork(cur)
}

function zap() {
  if (switching) return
  switching = true
  hold = 0
  let phase = 0
  const step = () => {
    phase += 0.06
    staticAmt = phase < 0.5 ? phase * 2 : Math.max(0, 2 - phase * 2)
    if (phase >= 0.5 && phase < 0.56) {
      cur += 1
      uploadWork(cur)
    }
    if (phase < 1) requestAnimationFrame(step)
    else {
      staticAmt = 0
      switching = false
    }
  }
  step()
}

addEventListener("pointerdown", zap)

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt
  if (!REDUCED && !switching) {
    hold += dt
    if (hold > 3.4) zap()
  }
  gl.uniform2f(uRes, vw, vh)
  gl.uniform1f(uTime, t)
  gl.uniform1f(uStatic, staticAmt + (REDUCED ? 0 : 0.03)) // faint grain always
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(43)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 73).map(w => WORKS.indexOf(w))
  uploadWork(cur)
  prev = performance.now()
  requestAnimationFrame(frame)
})
