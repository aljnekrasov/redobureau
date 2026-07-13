import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Lāse 064 — experimental. The whole grid of works lies still under water.
// Touch it and a drop lands — concentric ripples spread out, refracting the
// works beneath and catching the light on each crest, then fade as the
// surface settles. Drops also fall on their own now and then. WebGL, one
// quad, up to eight live ripples.

const canvas = document.getElementById("gl")
const gl = canvas.getContext("webgl", { antialias: true, alpha: false })

const MAX = 8

const VS = `attribute vec2 p; varying vec2 uv;
void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }`

const FS = `
precision highp float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec2 res;
uniform vec3 rip[${MAX}]; // xy = centre (0..1), z = age (s)
uniform int count;
void main() {
  vec2 disp = vec2(0.0);
  float crest = 0.0;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= count) break;
    vec3 r = rip[i];
    vec2 d = (uv - r.xy) * vec2(res.x / res.y, 1.0);
    float dist = length(d);
    float ring = r.z * 0.55;               // ripple front expands with age
    float band = dist - ring;
    float w = sin(band * 46.0) * exp(-abs(band) * 7.0) * exp(-r.z * 1.25);
    disp += normalize(d + 1e-5) * w * 0.028;
    crest += abs(w) * exp(-r.z * 1.25);
  }
  vec2 s = uv + disp;
  s = vec2(s.x, 1.0 - s.y);
  vec3 col = texture2D(tex, s).rgb;
  col += crest * vec3(0.16, 0.19, 0.24);   // light glints on the crests
  float vig = smoothstep(1.2, 0.3, length(uv - 0.5) * 1.4);
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
const uRip = gl.getUniformLocation(prog, "rip")
const uCount = gl.getUniformLocation(prog, "count")

function buildAtlas(imgs) {
  const cols = 6, rows = 5, cw = 512, ch = 342
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

// ripples as {x, y, age}
let ripples = []
let idle = 0
let rndSeed = 12345
function rnd() {
  rndSeed = (rndSeed * 1103515245 + 12345) & 0x7fffffff
  return rndSeed / 0x7fffffff
}

function drop(x, y) {
  ripples.push({ x, y, age: 0 })
  if (ripples.length > MAX) ripples.shift()
  idle = 0
}

canvas.addEventListener("pointerdown", e => drop(e.clientX / innerWidth, e.clientY / innerHeight))

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  idle += dt

  if (!REDUCED && idle > 2.4) {
    idle = 0
    drop(0.2 + rnd() * 0.6, 0.2 + rnd() * 0.6)
  }

  for (const r of ripples) r.age += dt
  ripples = ripples.filter(r => r.age < 5)

  const flat = new Float32Array(MAX * 3)
  ripples.forEach((r, i) => {
    flat[i * 3] = r.x
    flat[i * 3 + 1] = r.y
    flat[i * 3 + 2] = r.age
  })
  gl.uniform2f(uRes, vw, vh)
  gl.uniform3fv(uRip, flat)
  gl.uniform1i(uCount, ripples.length)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(35)
onViewport(async () => {
  resize()
  const imgs = await loadAll(shuffled(WORKS, 65))
  upload(buildAtlas(imgs))
  drop(0.5, 0.42)
  prev = performance.now()
  requestAnimationFrame(frame)
})
