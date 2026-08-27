// Glaze: the mark as a glass vessel, half-filled with water. The letters
// are windows of empty glass above and cool water below, split by a live
// waterline that sloshes like liquid in a tilted tumbler — a damped
// oscillator driven by the cursor, so dragging the mouse rocks the water
// and a click slaps a wave through it. Underwater: depth gradient, caustic
// shimmer, walls glowing near the glass, bubbles rising and popping at the
// surface. Above: dry glass with slow gloss streaks. A bright meniscus
// burns along the waterline.

const canvas = document.getElementById("scene_root")
const gl = canvas.getContext("webgl")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0, lastMX = null
let tilt = 0, tiltV = 0
let kick = 0

// -- mask ------------------------------------------------------------------------------------

let maskTex = null
fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 280
    const g = c.getContext("2d")
    const s = Math.min((1024 * 0.9) / img.width, (280 * 0.78) / img.height)
    const dw = img.width * s, dh = img.height * s
    g.drawImage(img, (1024 - dw) / 2, (280 - dh) / 2, dw, dh)
    maskTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    URL.revokeObjectURL(url)
  }
  img.src = url
})

// -- shader ------------------------------------------------------------------------------------

const vsrc = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`
const fsrc = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uMask;
uniform float uTilt;      // slosh tilt of the waterline
uniform float uKick;      // click impulse, decaying
uniform vec3 uBub[14];    // bubbles: x, y, r  (logo-plane units)

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float logoAt(vec2 q){
  float lw = min(1.5, (uRes.x / uRes.y) * 0.88);
  float lh = lw * (280.0 / 1024.0);
  vec2 m = vec2(q.x / lw + 0.5, q.y / lh + 0.5);
  if (m.x < 0.0 || m.x > 1.0 || m.y < 0.0 || m.y > 1.0) return 0.0;
  return texture2D(uMask, m).a;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 q = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float t = uTime;

  float m = logoAt(q);
  float ink = smoothstep(0.45, 0.55, m);

  // the waterline: half-full, tilted by the slosh, ridden by waves
  float lvl = -0.012
            + uTilt * q.x
            + 0.010 * sin(q.x * 11.0 - t * 2.6)
            + 0.007 * sin(q.x * 19.0 + t * 3.7)
            + uKick * 0.028 * sin(q.x * 8.0 - t * 9.0);
  float under = smoothstep(lvl + 0.003, lvl - 0.003, q.y);
  float depth = max(lvl - q.y, 0.0);

  // -- water body --
  vec3 water = mix(vec3(0.10, 0.44, 0.52), vec3(0.015, 0.10, 0.19), smoothstep(0.0, 0.30, depth));
  // caustic shimmer drifting through the letters
  float ca = vnoise(vec2(q.x * 9.0 + t * 0.5, (q.y + t * 0.18) * 12.0));
  ca = pow(smoothstep(0.55, 0.95, ca), 2.0);
  water += vec3(0.35, 0.65, 0.7) * ca * (0.4 + 0.6 * smoothstep(0.0, 0.1, depth)) * 0.5;
  // glass walls glow through the water
  float wall = 1.0 - smoothstep(0.5, 0.78, m);
  water += vec3(0.20, 0.5, 0.55) * wall * 0.45;

  // bubbles
  for (int i = 0; i < 14; i++) {
    vec3 b = uBub[i];
    vec2 d = q - b.xy;
    float r = length(d);
    float ring = smoothstep(b.z, b.z * 0.72, r) - smoothstep(b.z * 0.6, b.z * 0.3, r);
    water += vec3(0.55, 0.85, 0.9) * ring * 0.8;
    water += vec3(1.0) * smoothstep(b.z * 0.45, 0.0, length(d - vec2(-b.z * 0.3, b.z * 0.3))) * 0.35;
  }

  // -- dry glass above --
  vec3 glass = vec3(0.05, 0.065, 0.08);
  float streak = pow(0.5 + 0.5 * sin(q.x * 34.0 + sin(q.y * 5.0 + t * 0.35) * 2.2 + t * 0.22), 22.0);
  glass += vec3(0.9, 0.95, 1.0) * streak * 0.10;
  glass += vec3(0.30, 0.36, 0.42) * wall * 0.5;

  vec3 col = mix(glass, water, under) * ink;

  // meniscus: the bright waterline inside the letters
  float men = exp(-abs(q.y - lvl) * 160.0);
  col += vec3(0.75, 0.98, 1.0) * men * ink * (0.55 + 0.45 * sin(q.x * 30.0 + t * 3.0) * 0.3);
  // foam sparkle riding the line
  float foam = step(0.93, vnoise(vec2(q.x * 60.0 + t * 2.0, t * 1.3))) * men;
  col += vec3(1.0) * foam * ink * 0.5;

  // glass rim of the letterforms
  float edge = smoothstep(0.18, 0.5, m) * (1.0 - smoothstep(0.5, 0.82, m));
  col += vec3(0.42, 0.50, 0.58) * edge * (0.5 + 0.3 * sin(q.x * 3.0 + t * 0.4));

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src); gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s))
  return s
}
const prog = gl.createProgram()
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsrc))
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsrc))
gl.linkProgram(prog)
gl.useProgram(prog)

const buf = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buf)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
const loc = gl.getAttribLocation(prog, "p")
gl.enableVertexAttribArray(loc)
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

const U = {
  res: gl.getUniformLocation(prog, "uRes"),
  time: gl.getUniformLocation(prog, "uTime"),
  mask: gl.getUniformLocation(prog, "uMask"),
  tilt: gl.getUniformLocation(prog, "uTilt"),
  kick: gl.getUniformLocation(prog, "uKick"),
  bub: gl.getUniformLocation(prog, "uBub")
}

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
  gl.viewport(0, 0, width, height)
}
applySize()
window.addEventListener("resize", applySize)

window.addEventListener("mousemove", e => {
  const mx = (e.clientX / width - 0.5) * 2
  if (lastMX !== null) tiltV += (mx - lastMX) * 1.4   // stirring rocks the water
  lastMX = mx
  mouseX = mx
})
window.addEventListener("mousedown", () => { kick = 1; tiltV += (Math.random() - 0.5) * 0.8 })

// -- bubbles ------------------------------------------------------------------------------------

const NB = 14
const bub = new Float32Array(NB * 3)
const bubSpeed = new Float32Array(NB)
function respawn(i, lw) {
  bub[i * 3] = (Math.random() - 0.5) * lw * 0.92
  bub[i * 3 + 1] = -0.30 - Math.random() * 0.1
  bub[i * 3 + 2] = 0.004 + Math.random() * 0.009
  bubSpeed[i] = 0.03 + Math.random() * 0.05
}
let bubInit = false

// -- loop --------------------------------------------------------------------------------------

let t = 0
let kickT = 0
let last = performance.now()

function step(dt) {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  t += dt
  const aspect = width / height
  const lw = Math.min(1.5, aspect * 0.88)

  if (!bubInit) { for (let i = 0; i < NB; i++) { respawn(i, lw); bub[i * 3 + 1] = -0.3 + Math.random() * 0.28 } bubInit = true }

  // damped slosh oscillator
  const k = 18, c = 1.6
  tiltV += (-k * tilt - c * tiltV) * dt
  tilt += tiltV * dt
  tilt = Math.max(-0.16, Math.min(0.16, tilt))
  kick *= Math.exp(-dt * 2.2)

  for (let i = 0; i < NB; i++) {
    bub[i * 3 + 1] += bubSpeed[i] * dt * (1 + kick * 1.5)
    bub[i * 3] += Math.sin(t * 3 + i * 2.1) * 0.008 * dt * 60
    const lvl = -0.012 + tilt * bub[i * 3]
    if (bub[i * 3 + 1] > lvl - bub[i * 3 + 2]) respawn(i, lw)
  }

  if (maskTex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(U.mask, 0) }
  gl.uniform2f(U.res, width, height)
  gl.uniform1f(U.time, t)
  gl.uniform1f(U.tilt, tilt)
  gl.uniform1f(U.kick, kick)
  gl.uniform3fv(U.bub, bub)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = {
  get t() { return t }, set t(v) { t = v },
  set tilt(v) { tilt = v }, set kick(v) { kick = v },
  step
}
