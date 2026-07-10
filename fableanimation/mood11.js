import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Šķidrums 040 — experimental. The whole portfolio, packed into one 6×5
// texture, poured onto the screen as liquid: standing waves ripple through
// the grid, the cursor drags a lens that bulges and smears the works
// underneath, and every edge splits into chromatic fringes. Pure WebGL,
// one fullscreen quad, thirty works living in a single frame.

const canvas = document.getElementById("gl")
const gl = canvas.getContext("webgl", { antialias: true, alpha: false, premultipliedAlpha: false })

const VS = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`

const FS = `
precision highp float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec2 res;
uniform float time;
uniform vec2 mouse;
uniform float energy;
void main() {
  vec2 st = uv;
  float t = time;
  // two crossing swells — the sheet of works never sits still
  st.x += 0.010 * sin(st.y * 13.0 + t * 1.30);
  st.y += 0.010 * cos(st.x * 11.0 + t * 1.05);

  // the cursor is a lens: nearby uv is pushed outward, magnifying
  vec2 d = st - mouse;
  d.x *= res.x / res.y;
  float r = length(d);
  float lens = smoothstep(0.36, 0.0, r) * (0.10 + energy * 0.14);
  st += (st - mouse) * lens * 2.2;

  // chromatic split grows toward the frame and inside the lens
  vec2 dir = normalize(st - vec2(0.5) + 1e-5);
  float ca = 0.003 + lens * 0.03 + length(uv - 0.5) * 0.004;
  vec2 s = vec2(st.x, 1.0 - st.y);
  float R = texture2D(tex, s + dir * ca).r;
  float G = texture2D(tex, s).g;
  float B = texture2D(tex, s - dir * ca).b;
  vec3 col = vec3(R, G, B);

  float vig = smoothstep(1.15, 0.25, length(uv - 0.5) * 1.5);
  gl_FragColor = vec4(col * vig, 1.0);
}
`

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
const uMouse = gl.getUniformLocation(prog, "mouse")
const uEnergy = gl.getUniformLocation(prog, "energy")

// pack all thirty works into one atlas texture (cover-fit uniform cells)
function buildAtlas(imgs) {
  const cols = 6
  const rows = 5
  const cw = 512
  const ch = 342
  const a = document.createElement("canvas")
  a.width = cols * cw
  a.height = rows * ch
  const g = a.getContext("2d")
  g.fillStyle = "#0a0a0c"
  g.fillRect(0, 0, a.width, a.height)
  imgs.forEach((img, i) => {
    if (!img.naturalWidth) return
    coverDraw(g, img, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch)
  })
  return a
}

function upload(atlas) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
}

let vw = 0
let vh = 0
function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  gl.viewport(0, 0, vw, vh)
}

let tmx = 0.5
let tmy = 0.5
let mx = 0.5
let my = 0.5
let energy = 0
let t = 0
let idle = 0

addEventListener("pointermove", e => {
  const nx = e.clientX / innerWidth
  const ny = e.clientY / innerHeight
  energy = Math.min(1, energy + Math.hypot(nx - tmx, ny - tmy) * 6)
  tmx = nx
  tmy = ny
  idle = 0
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += REDUCED ? dt * 0.3 : dt
  idle += dt

  if (idle > 2 && !REDUCED) {
    // the lens wanders on its own when idle
    tmx = 0.5 + 0.3 * Math.sin(t * 0.29)
    tmy = 0.5 + 0.26 * Math.cos(t * 0.21)
  }
  const k = Math.min(1, dt * 5)
  mx += (tmx - mx) * k
  my += (tmy - my) * k
  energy *= Math.pow(0.15, dt)

  gl.uniform2f(uRes, vw, vh)
  gl.uniform1f(uTime, t)
  gl.uniform2f(uMouse, mx, my)
  gl.uniform1f(uEnergy, energy)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(11)
onViewport(async () => {
  resize()
  const imgs = await loadAll(shuffled(WORKS, 33))
  upload(buildAtlas(imgs))
  prev = performance.now()
  requestAnimationFrame(frame)
})
