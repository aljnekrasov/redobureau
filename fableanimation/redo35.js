// Tinte: the mark stamped in luminous ink into dark water. Every cycle the
// logotype prints crisp — then a slow curl-noise current takes it, the
// letters stretch into filaments, fold into each other and dissolve to
// smoke, until the stamp comes down again. The simulation is a ping-pong
// dye field advected on the GPU. Stirring the cursor adds a vortex that
// drags the ink with it.

const canvas = document.getElementById("scene_root")
const gl = canvas.getContext("webgl")

const SW = 1024, SH = 576          // simulation resolution, fixed 16:9

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0.5, mouseY = 0.5
let energy = 0
let lastX = null, lastY = null

// -- logo mask -------------------------------------------------------------------------

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

// -- programs --------------------------------------------------------------------------

const vsrc = `attribute vec2 p; varying vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`

const NOISE = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float logoAt(vec2 uv, sampler2D msk){
  vec2 q = (uv - 0.5) * vec2(16.0/9.0, 1.0);
  float lw = 1.45;
  float lh = lw * (280.0 / 1024.0);
  vec2 m = vec2(q.x / lw + 0.5, q.y / lh + 0.5);
  if (m.x < 0.0 || m.x > 1.0 || m.y < 0.0 || m.y > 1.0) return 0.0;
  return texture2D(msk, m).a;
}
`

const simFsrc = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform sampler2D uMask;
uniform float uTime;
uniform float uDt;
uniform float uStamp;
uniform vec2 uMouse;
uniform float uSwirl;
${NOISE}
float pot(vec2 p){
  return vnoise(p*2.6 + vec2(0.0, uTime*0.11))
       + 0.55 * vnoise(p*6.2 - vec2(uTime*0.07, 0.0));
}
vec2 velAt(vec2 uv){
  vec2 p = uv * vec2(16.0/9.0, 1.0);
  float e = 0.014;
  float dx = pot(p + vec2(e,0.0)) - pot(p - vec2(e,0.0));
  float dy = pot(p + vec2(0.0,e)) - pot(p - vec2(0.0,e));
  vec2 v = vec2(dy, -dx) * 1.5;
  // cursor vortex
  vec2 dm = (uv - uMouse) * vec2(16.0/9.0, 1.0);
  float r2 = dot(dm, dm);
  v += vec2(-dm.y, dm.x) * uSwirl * exp(-r2 * 22.0) * 6.0;
  return v;
}
void main(){
  vec2 back = vUv - velAt(vUv) * uDt * 0.05;
  float d = texture2D(uPrev, back).r;
  d *= 0.9985;                                 // the ink thins as it drifts
  d = d - 0.0004;                              // and finally lets go
  float m = logoAt(vUv, uMask);
  d = max(d, m * uStamp);
  gl_FragColor = vec4(clamp(d, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`

const drawFsrc = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDye;
void main(){
  float d = texture2D(uDye, vUv).r;
  vec3 bg = vec3(0.016, 0.016, 0.024) + vec3(0.01, 0.012, 0.02) * (1.0 - vUv.y);
  float body = pow(d, 0.75);
  vec3 ink = vec3(0.93, 0.92, 0.87) * body;
  // a cold blue breath around the thin edges of the ink
  float halo = smoothstep(0.015, 0.22, d) * (1.0 - smoothstep(0.25, 0.9, d));
  vec3 col = bg + ink + vec3(0.16, 0.26, 0.5) * halo * 0.35;
  float r = length(vUv - 0.5);
  col *= 1.0 - 0.3 * r * r * 2.0;
  gl_FragColor = vec4(col, 1.0);
}
`

function program(fs) {
  const compile = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s))
    return s
  }
  const p = gl.createProgram()
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vsrc))
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  return p
}

const simProg = program(simFsrc)
const drawProg = program(drawFsrc)

const buf = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buf)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
function bindQuad(prog) {
  const loc = gl.getAttribLocation(prog, "p")
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
}

// -- ping-pong dye field ---------------------------------------------------------------

function makeTarget() {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SW, SH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { tex, fb }
}
let ping = makeTarget()
let pong = makeTarget()

const US = {
  prev: gl.getUniformLocation(simProg, "uPrev"),
  mask: gl.getUniformLocation(simProg, "uMask"),
  time: gl.getUniformLocation(simProg, "uTime"),
  dt: gl.getUniformLocation(simProg, "uDt"),
  stamp: gl.getUniformLocation(simProg, "uStamp"),
  mouse: gl.getUniformLocation(simProg, "uMouse"),
  swirl: gl.getUniformLocation(simProg, "uSwirl")
}
const UD = { dye: gl.getUniformLocation(drawProg, "uDye") }

// -- sizing / input --------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
}
applySize()
window.addEventListener("resize", applySize)

window.addEventListener("mousemove", e => {
  mouseX = e.clientX / width
  mouseY = 1 - e.clientY / height
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX-lastX, e.clientY-lastY)/Math.max(width,height)*5, 1.5)
  lastX = e.clientX; lastY = e.clientY
})

// -- loop ------------------------------------------------------------------------------

const CYCLE = 11
let t = 0
let last = performance.now()

function step(dt) {
  t += dt
  energy *= Math.pow(0.4, dt)

  if (!maskTex) return
  const phase = t % CYCLE
  // the stamp presses hard at the top of each cycle, then lifts
  const stamp = Math.exp(-phase * 1.6) * 0.95

  // sim pass
  gl.useProgram(simProg)
  bindQuad(simProg)
  gl.bindFramebuffer(gl.FRAMEBUFFER, pong.fb)
  gl.viewport(0, 0, SW, SH)
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ping.tex); gl.uniform1i(US.prev, 0)
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(US.mask, 1)
  gl.uniform1f(US.time, t)
  gl.uniform1f(US.dt, Math.min(dt, 0.033))
  gl.uniform1f(US.stamp, stamp)
  gl.uniform2f(US.mouse, mouseX, mouseY)
  gl.uniform1f(US.swirl, energy)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  // draw pass
  gl.useProgram(drawProg)
  bindQuad(drawProg)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, width, height)
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, pong.tex); gl.uniform1i(UD.dye, 0)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  const tmp = ping; ping = pong; pong = tmp
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = { get t(){ return t }, set t(v){ t = v }, step }
