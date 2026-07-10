import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Mirāža 050 — experimental. The grid of works seen across hot tarmac: a
// slow heat-haze warps the whole atlas, rippling strongest low in the frame
// where the air shimmers hardest, easing off toward the top. The cursor
// leaves a warm bloom in the mirage. WebGL, one quad, procedural noise —
// no big waves like the liquid board, just air that won't hold still.

const canvas = document.getElementById("gl")
const gl = canvas.getContext("webgl", { antialias: true, alpha: false })

const VS = `
attribute vec2 p; varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`

const FS = `
precision highp float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec2 res;
uniform float time;
uniform vec2 mouse;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){ return 0.62 * noise(p) + 0.38 * noise(p * 2.13 + 7.0); }

void main() {
  float t = time * 0.32;
  // heat rises: noise scrolls upward, warps stronger near the bottom
  float w1 = fbm(uv * 4.5 + vec2(0.0, -t * 1.6));
  float w2 = fbm(uv * 8.0 + vec2(t * 0.7, -t * 2.4));
  float lowBias = 0.45 + (1.0 - uv.y) * 1.1;
  vec2 disp = vec2(w1 - 0.5, w2 - 0.5) * 0.022 * lowBias;

  vec2 st = uv + disp;
  vec3 col = texture2D(tex, vec2(st.x, 1.0 - st.y)).rgb;

  // the air bleaches colour a touch and glows warm
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 0.82);
  col += vec3(0.03, 0.02, 0.0) * (w1 - 0.4);

  // warm bloom under the cursor
  float dm = length((uv - mouse) * vec2(res.x / res.y, 1.0));
  col += vec3(0.08, 0.04, 0.01) * smoothstep(0.26, 0.0, dm);

  float vig = smoothstep(1.2, 0.28, length(uv - 0.5) * 1.42);
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

let tmx = 0.5
let tmy = 0.5
let mx = 0.5
let my = 0.5
let t = 0

addEventListener("pointermove", e => {
  tmx = e.clientX / innerWidth
  tmy = e.clientY / innerHeight
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += REDUCED ? dt * 0.3 : dt
  const k = Math.min(1, dt * 4)
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

mountNav(21)
onViewport(async () => {
  resize()
  const imgs = await loadAll(shuffled(WORKS, 21))
  upload(buildAtlas(imgs))
  prev = performance.now()
  requestAnimationFrame(frame)
})
