// Udens: the mark painted on the floor of a pool. The water above it is
// never still — travelling waves and a noisy chop refract the letterforms,
// bending them liquid, while caustic light nets crawl across the floor
// where the surface focuses the sun. Moving the cursor chops the surface;
// a click drops a ring of rain into the pool.

const canvas = document.getElementById("scene_root")
const gl = canvas.getContext("webgl")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0.5
let mouseY = 0.5
let clickT = -10
let energy = 0
let lastX = null, lastY = null

// -- logo mask -------------------------------------------------------------------------

const maskCanvas = document.createElement("canvas")
maskCanvas.width = 1024
maskCanvas.height = 280
let maskTex = null

fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const g = maskCanvas.getContext("2d")
    const s = Math.min((1024 * 0.9) / img.width, (280 * 0.78) / img.height)
    const dw = img.width * s, dh = img.height * s
    g.clearRect(0, 0, 1024, 280)
    g.drawImage(img, (1024 - dw) / 2, (280 - dh) / 2, dw, dh)
    maskTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    URL.revokeObjectURL(url)
  }
  img.src = url
})

// -- shader ----------------------------------------------------------------------------

const vsrc = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const fsrc = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uMask;
uniform vec2 uMouse;
uniform float uClick;
uniform float uEnergy;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

// water surface height at q (height-normalised centred coords)
float wat(vec2 p){
  float t = uTime;
  float h = 0.0;
  h += 0.14 * sin(dot(p, vec2(21.0, 12.6)) - t*2.6);
  h += 0.10 * sin(dot(p, vec2(-15.6, 25.8)) + t*2.0);
  h += 0.07 * sin(dot(p, vec2(34.5,-18.9)) + t*3.1);
  h += (vnoise(p*9.0 + vec2(t*0.5, -t*0.35)) - 0.5) * (0.08 + uEnergy*0.3);
  // cursor chop
  vec2 m = (uMouse - 0.5) * vec2(uRes.x/uRes.y, 1.0);
  float dm = length(p - m);
  h += sin(dm*30.0 - t*7.0) * exp(-dm*4.5) * uEnergy * 1.6;
  // click rain-ring
  float age = uTime - uClick;
  h += sin(dm*40.0 - age*9.0) * exp(-dm*5.0) * exp(-age*2.0) * 1.4;
  return h;
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

  // surface normal and curvature from the heightfield
  float e = 0.012;
  float hC = wat(q);
  float hL = wat(q - vec2(e,0.0)), hR = wat(q + vec2(e,0.0));
  float hB = wat(q - vec2(0.0,e)), hT = wat(q + vec2(0.0,e));
  vec2 slope = vec2(hR - hL, hT - hB) / (2.0 * e);
  float lap = (hL + hR + hB + hT - 4.0 * hC) / (e * e);

  // refraction: the floor is seen through the bent surface
  vec2 rq = q + slope * 0.0045;
  float m = logoAt(rq);
  float aa = 0.02;
  float ink = smoothstep(0.5 - aa, 0.5 + aa, m);

  // pool floor with depth shading, the mark in worn cream paint
  vec3 floorCol = vec3(0.03, 0.13, 0.145) * (0.85 + 0.3 * (1.0 - uv.y));
  vec3 paint = vec3(0.88, 0.87, 0.80);
  vec3 col = mix(floorCol, paint, ink * 0.92);

  // caustics: light focuses where the surface converges
  float caust = smoothstep(0.5, 1.0, -lap * 0.012);
  caust = pow(caust, 1.3);
  col *= 0.95 + caust * 0.95;
  col += vec3(0.35, 0.6, 0.6) * caust * 0.25;

  // faint surface glints
  vec3 n = normalize(vec3(-slope.x, -slope.y, 0.35));
  float spec = pow(max(dot(n, normalize(vec3(0.4, 0.55, 0.72))), 0.0), 24.0);
  col += vec3(0.9, 0.95, 1.0) * spec * 0.18;

  // vignette of depth
  col *= 1.0 - 0.35 * length(uv - 0.5);

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
  mouse: gl.getUniformLocation(prog, "uMouse"),
  click: gl.getUniformLocation(prog, "uClick"),
  energy: gl.getUniformLocation(prog, "uEnergy")
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
  mouseX = e.clientX / width
  mouseY = 1 - e.clientY / height
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX-lastX, e.clientY-lastY)/Math.max(width,height)*4, 1.2)
  lastX = e.clientX; lastY = e.clientY
})
window.addEventListener("mousedown", () => { clickT = t })

let t = 0
let last = performance.now()
function step(dt) {
  t += dt
  energy *= Math.pow(0.45, dt)
  if (maskTex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(U.mask, 0) }
  gl.uniform2f(U.res, width, height)
  gl.uniform1f(U.time, t)
  gl.uniform2f(U.mouse, mouseX, mouseY)
  gl.uniform1f(U.click, clickT)
  gl.uniform1f(U.energy, energy)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = { get t(){ return t }, set t(v){ t = v }, step }
