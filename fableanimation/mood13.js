import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Spogulis 042 — experimental. The thirty works fed through a mirror. A
// rotating kaleidoscope folds the atlas into radial symmetry so fragments
// of every project — a wine label, a neon sign, a 3D render — meet in one
// turning rose window. Cursor left↔right sets how many mirrors (6–16),
// up↕down sets the zoom. WebGL, one quad.

const canvas = document.getElementById("gl")
const gl = canvas.getContext("webgl", { antialias: true, alpha: false })

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
const float PI = 3.14159265;
void main() {
  vec2 c = uv - 0.5;
  c.x *= res.x / res.y;
  float ang = atan(c.y, c.x);
  float rad = length(c);

  float seg = mix(6.0, 16.0, mouse.x);
  float slice = PI / seg;
  ang = mod(ang, 2.0 * slice);
  ang = abs(ang - slice);   // fold into a mirrored wedge
  ang += time * 0.14;       // turn the wheel

  float zoom = mix(0.55, 1.7, mouse.y);
  vec2 p = vec2(cos(ang), sin(ang)) * rad * zoom;
  vec2 suv = fract(p + vec2(0.5) + vec2(time * 0.021, time * 0.016));
  suv.y = 1.0 - suv.y;
  vec3 col = texture2D(tex, suv).rgb;

  // gentle glow toward the eye of the kaleidoscope, dark rim
  col *= smoothstep(1.25, 0.05, rad * 1.35) * 0.55 + 0.72;
  gl_FragColor = vec4(col, 1.0);
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
    if (img.naturalWidth) coverDraw(g, img, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch)
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

let tmx = 0.4
let tmy = 0.5
let mx = 0.4
let my = 0.5
let t = 0
let idle = 0

addEventListener("pointermove", e => {
  tmx = e.clientX / innerWidth
  tmy = e.clientY / innerHeight
  idle = 0
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += REDUCED ? dt * 0.35 : dt
  idle += dt
  if (idle > 2.5 && !REDUCED) {
    tmx = 0.5 + 0.4 * Math.sin(t * 0.13)
    tmy = 0.5 + 0.35 * Math.sin(t * 0.19 + 1.0)
  }
  const k = Math.min(1, dt * 3)
  mx += (tmx - mx) * k
  my += (tmy - my) * k

  gl.uniform2f(uRes, vw, vh)
  gl.uniform1f(uTime, t)
  gl.uniform2f(uMouse, mx, my)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(13)
onViewport(async () => {
  resize()
  const imgs = await loadAll(shuffled(WORKS, 7))
  upload(buildAtlas(imgs))
  prev = performance.now()
  requestAnimationFrame(frame)
})
