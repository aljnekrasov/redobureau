import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Sapnis 053 — experimental. The portfolio as a slow dream: each work fills
// the screen, then dissolves into the next through a liquid warp — both
// images bending toward each other on a noise field before they cross-fade.
// No grid, no controls to fuss with, just one image melting into another.
// WebGL, two textures, a procedural morph.

const canvas = document.getElementById("gl")
const gl = canvas.getContext("webgl", { antialias: true, alpha: false })

const VS = `
attribute vec2 p; varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`

const FS = `
precision highp float;
varying vec2 uv;
uniform sampler2D texA;
uniform sampler2D texB;
uniform float progress;
uniform float time;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){ return 0.6 * noise(p) + 0.4 * noise(p * 2.1 + 5.0); }

void main() {
  vec2 st = vec2(uv.x, 1.0 - uv.y);
  vec2 w = vec2(fbm(uv * 3.5 + time * 0.06), fbm(uv * 3.5 + 19.0 - time * 0.05)) - 0.5;
  float t = smoothstep(0.0, 1.0, progress);
  // both images bow toward each other, then cross-fade
  vec2 uvA = st + w * 0.07 * t;
  vec2 uvB = st + w * 0.07 * (t - 1.0);
  vec3 a = texture2D(texA, uvA).rgb;
  vec3 b = texture2D(texB, uvB).rgb;
  vec3 col = mix(a, b, t);
  // a breath of shimmer even at rest
  col *= 1.0 + (fbm(uv * 6.0 + time * 0.1) - 0.5) * 0.05;
  float vig = smoothstep(1.25, 0.25, length(uv - 0.5) * 1.35);
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

gl.uniform1i(gl.getUniformLocation(prog, "texA"), 0)
gl.uniform1i(gl.getUniformLocation(prog, "texB"), 1)
const uProgress = gl.getUniformLocation(prog, "progress")
const uTime = gl.getUniformLocation(prog, "time")

function makeTex(unit) {
  const tex = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return { tex, unit }
}
const texA = makeTex(0)
const texB = makeTex(1)

// cover-draw a work into an offscreen at the canvas aspect, then upload
const cover = document.createElement("canvas")
const cctx = cover.getContext("2d")
function uploadWork(target, workIndex) {
  const img = imgs[order[workIndex]]
  cctx.fillStyle = "#000"
  cctx.fillRect(0, 0, cover.width, cover.height)
  if (img && img.naturalWidth) coverDraw(cctx, img, 0, 0, cover.width, cover.height)
  gl.activeTexture(gl.TEXTURE0 + target.unit)
  gl.bindTexture(gl.TEXTURE_2D, target.tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cover)
}

let vw = 0
let vh = 0
let imgs = []
let order = []
let cur = 0
let nxt = 1
let phaseMorph = false
let timer = 0
let progress = 0
let t = 0

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  gl.viewport(0, 0, vw, vh)
  cover.width = Math.min(1600, vw)
  cover.height = Math.round(cover.width * (vh / vw))
  if (imgs.length) {
    uploadWork(texA, cur)
    uploadWork(texB, nxt)
  }
}

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt

  if (!REDUCED) {
    if (!phaseMorph) {
      timer += dt
      if (timer > 0.3) {
        timer = 0
        phaseMorph = true
      }
    } else {
      progress = Math.min(1, progress + dt / 1.7)
      if (progress >= 1) {
        cur = nxt
        nxt = (nxt + 1) % order.length
        uploadWork(texA, cur)
        uploadWork(texB, nxt)
        progress = 0
        phaseMorph = false
        timer = 0
      }
    }
  }

  gl.uniform1f(uProgress, progress)
  gl.uniform1f(uTime, t)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(24)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 53).map(w => WORKS.indexOf(w))
  uploadWork(texA, cur)
  uploadWork(texB, nxt)
  prev = performance.now()
  requestAnimationFrame(frame)
})
