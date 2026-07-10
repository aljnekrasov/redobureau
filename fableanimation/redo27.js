// Dzivsudrabs: the mark as a pool of liquid mercury. A raymarched height
// field — the logo silhouette raised into a molten bead — ripples with
// travelling waves and a shimmer of noise; a hard studio HDRI of light
// bars reflects off its chrome skin, so it reads as a droplet of quicksilver
// holding the shape. The cursor drops ripples into the pool.

const canvas = document.getElementById("scene_root")
const gl = canvas.getContext("webgl")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0.5
let mouseY = 0.5
let clickT = -10
let energy = 0
let lastX = null, lastY = null

// -- logo mask (distance-friendly alpha) ----------------------------------------------

const maskCanvas = document.createElement("canvas")
maskCanvas.width = 1024
maskCanvas.height = 280
let maskTex = null
let maskFracX = 1

const img = new Image()
fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  img.onload = () => {
    const g = maskCanvas.getContext("2d")
    const s = Math.min((1024 * 0.9) / img.width, (280 * 0.78) / img.height)
    const dw = img.width * s, dh = img.height * s
    g.clearRect(0, 0, 1024, 280)
    g.drawImage(img, (1024 - dw) / 2, (280 - dh) / 2, dw, dh)
    maskFracX = dw / 1024
    uploadMask()
    URL.revokeObjectURL(url)
  }
  img.src = url
})

function uploadMask() {
  maskTex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, maskTex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
}

// -- shader ---------------------------------------------------------------------------

const vsrc = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const fsrc = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uMask;
uniform vec2 uMouse;
uniform float uClick;
uniform float uEnergy;
uniform float uFracX;

float logo(vec2 uv){
  // height-normalised centred coords keep the mark's true proportions
  vec2 q = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float lw = 1.5;                      // logo rect width in height units
  float lh = lw * (280.0 / 1024.0);    // mask canvas aspect
  vec2 m = vec2(q.x / lw + 0.5, q.y / lh + 0.5);
  if (m.x < 0.0 || m.x > 1.0 || m.y < 0.0 || m.y > 1.0) return 0.0;
  return texture2D(uMask, m).a;
}

// smooth logo coverage via a few taps
float cover(vec2 uv){
  float e = 0.006;
  float a = logo(uv);
  a += logo(uv + vec2(e,0.0)) + logo(uv - vec2(e,0.0));
  a += logo(uv + vec2(0.0,e)) + logo(uv - vec2(0.0,e));
  return a / 5.0;
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

// height of the mercury bead at uv
float H(vec2 uv){
  float c = cover(uv);
  if (c < 0.02) return 0.0;
  // dome from coverage, plus travelling ripples and a noisy shimmer
  float dome = smoothstep(0.0, 0.5, c);
  float t = uTime;
  float wav = 0.5 * sin((uv.x*22.0 + uv.y*8.0) - t*2.2)
            + 0.3 * sin((uv.x*8.0 - uv.y*26.0) + t*1.7);
  float shim = vnoise(uv*14.0 + t*0.4) - 0.5;
  // click ripple from the cursor
  float d = length((uv - uMouse) * vec2(uRes.x/uRes.y, 1.0));
  float rip = sin(d*46.0 - (uTime - uClick)*10.0) * exp(-d*7.0) * exp(-(uTime-uClick)*2.5);
  return dome * (0.10 + 0.018*wav*(0.6+uEnergy) + 0.012*shim) + rip*0.05*step(uClick,uTime);
}

// hard studio environment: horizontal light bars on dark
vec3 env(vec3 r){
  float b = smoothstep(0.86, 0.9, sin(r.y*7.0)*0.5+0.5);
  b += smoothstep(0.7,0.95, sin(r.y*3.0 + 1.0)*0.5+0.5)*0.7;
  float side = smoothstep(0.3,0.9, r.x*0.5+0.5);
  vec3 c = vec3(0.03,0.04,0.06) + vec3(0.9,0.95,1.05)*b;
  c += vec3(0.10,0.13,0.2)*side;
  // a warm kicker low
  c += vec3(0.5,0.35,0.2) * smoothstep(0.8,1.0, -r.y);
  return c;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 asp = vec2(uRes.x/uRes.y, 1.0);

  float c = cover(uv);
  float h = H(uv);
  // gradient of height -> surface normal
  vec2 e = vec2(1.5/uRes.x, 1.5/uRes.y);
  float hx = H(uv+vec2(e.x,0.0)) - H(uv-vec2(e.x,0.0));
  float hy = H(uv+vec2(0.0,e.y)) - H(uv-vec2(0.0,e.y));
  vec3 n = normalize(vec3(-hx*60.0, -hy*60.0, 1.0));

  vec3 viewDir = vec3(0.0,0.0,1.0);
  vec3 r = reflect(-viewDir, n);
  vec3 refl = env(r);

  float fres = pow(1.0 - max(n.z,0.0), 3.0);
  vec3 merc = refl * (0.55 + 0.6*fres) + vec3(0.04,0.05,0.07);
  // rim darkening at the bead edge
  float edge = smoothstep(0.02, 0.22, c);
  vec3 bg = vec3(0.028,0.032,0.045) + vec3(0.02,0.03,0.05)*(1.0-uv.y);

  vec3 col = mix(bg, merc, edge);
  // a bright specular pip
  col += vec3(1.0) * pow(max(dot(r, normalize(vec3(0.3,0.7,0.6))),0.0), 40.0) * edge;

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
  energy: gl.getUniformLocation(prog, "uEnergy"),
  fracX: gl.getUniformLocation(prog, "uFracX")
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
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX-lastX, e.clientY-lastY)/Math.max(width,height)*5, 1.5)
  lastX = e.clientX; lastY = e.clientY
})
window.addEventListener("mousedown", () => { clickT = tGlobal })

let tGlobal = 0
let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  tGlobal += dt
  energy *= Math.pow(0.4, dt)

  if (maskTex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(U.mask, 0) }
  gl.uniform2f(U.res, width, height)
  gl.uniform1f(U.time, tGlobal)
  gl.uniform2f(U.mouse, mouseX, mouseY)
  gl.uniform1f(U.click, clickT)
  gl.uniform1f(U.energy, energy)
  gl.uniform1f(U.fracX, maskFracX)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}
requestAnimationFrame(frame)

window.__fable = { get t(){ return tGlobal }, render(){ frame(performance.now()) } }
