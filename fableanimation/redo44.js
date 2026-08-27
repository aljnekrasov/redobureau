// Trauks: the mark as real blown glass, half-filled with water — all 3D.
// The letters are raymarched from the logo's signed-distance field with a
// rounded stadium profile, so in section every stroke is a puffy glass rod.
// The material refracts: rays bend through the front wall, run through the
// interior, tint through the water and exit into the environment; fresnel
// mixes in the reflections. The water plane stays level in WORLD space
// while the mouse tilts the letters, so tipping the mark makes the water
// slosh along it — a damped oscillator adds the wave lag, a click slaps it.
// Bubbles rise through the flooded strokes. Crossing the waterline inside
// the glass ignites the meniscus.

const canvas = document.getElementById("scene_root")
const gl = canvas.getContext("webgl")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mx = 0, my = 0, smx = 0, smy = 0
let lastMX = null
let tilt = 0, tiltV = 0, kick = 0

// -- signed distance field of the mark (chamfer transform, like Hroms) -----------------------

const GW = 768, GH = 210
const distTex = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, distTex)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, GW, GH, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE,
  new Uint8Array(GW * GH).fill(254))
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = GW; c.height = GH
    const g = c.getContext("2d")
    const s = Math.min((GW * 0.94) / img.width, (GH * 0.82) / img.height)
    const dw = img.width * s, dh = img.height * s
    g.drawImage(img, (GW - dw) / 2, (GH - dh) / 2, dw, dh)
    const a = g.getImageData(0, 0, GW, GH).data

    const INF = 1e6
    const dIn = new Float32Array(GW * GH)
    const dOut = new Float32Array(GW * GH)
    for (let i = 0; i < GW * GH; i++) {
      const inside = a[i * 4 + 3] > 127
      dOut[i] = inside ? 0 : INF
      dIn[i] = inside ? INF : 0
    }
    const D = 1.41421356
    function chamfer(d) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const i = y * GW + x
        if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1)
        if (y > 0) d[i] = Math.min(d[i], d[i - GW] + 1)
        if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - GW - 1] + D)
        if (x < GW - 1 && y > 0) d[i] = Math.min(d[i], d[i - GW + 1] + D)
      }
      for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) {
        const i = y * GW + x
        if (x < GW - 1) d[i] = Math.min(d[i], d[i + 1] + 1)
        if (y < GH - 1) d[i] = Math.min(d[i], d[i + GW] + 1)
        if (x < GW - 1 && y < GH - 1) d[i] = Math.min(d[i], d[i + GW + 1] + D)
        if (x > 0 && y < GH - 1) d[i] = Math.min(d[i], d[i + GW - 1] + D)
      }
    }
    chamfer(dOut); chamfer(dIn)

    const pxToWorld = 2.3 / GW
    const out = new Uint8Array(GW * GH)
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x
      const d = (dOut[i] - dIn[i]) * pxToWorld
      out[(GH - 1 - y) * GW + x] = Math.max(1, Math.min(254, Math.round(128 + d * 160)))
    }
    gl.bindTexture(gl.TEXTURE_2D, distTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, GW, GH, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, out)
    URL.revokeObjectURL(url)
  }
  img.src = url
})

// -- shader ------------------------------------------------------------------------------------

const vsrc = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`
const fsrc = `
precision highp float;
#define LW 2.3
#define LH 0.6291
#define RND 0.062
#define FLAT 0.015
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uDist;
uniform vec2 uRot;        // letters tilt: x = yaw, y = pitch
uniform float uSlosh;     // waterline lag slope
uniform float uKick;
uniform vec4 uBub[6];     // bubbles: xyz + r (world)

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float logoD2(vec2 xy){
  vec2 uv = xy / vec2(LW, LH) + 0.5;
  vec2 cl = clamp(uv, 0.0, 1.0);
  float d = (texture2D(uDist, cl).r * 255.0 - 128.0) / 160.0;
  return d + length((uv - cl) * vec2(LW, LH));
}

// world -> letter space: the mark rocks around its own axis (roll),
// with a whisper of pitch for depth
vec3 toLogo(vec3 p){
  p.xy = rot(-uRot.x) * p.xy;
  p.yz = rot(-uRot.y) * p.yz;
  return p;
}

// rounded stadium profile: puffy glass rod along every stroke
float sdGlass(vec3 pw){
  vec3 p = toLogo(pw);
  float d2 = logoD2(p.xy);
  vec2 w = vec2(max(d2, 0.0), max(abs(p.z) - FLAT, 0.0));
  return length(w) - RND;
}

vec3 calcN(vec3 p){
  vec2 e = vec2(0.013, 0.0);
  return normalize(vec3(
    sdGlass(p+e.xyy) - sdGlass(p-e.xyy),
    sdGlass(p+e.yxy) - sdGlass(p-e.yxy),
    sdGlass(p+e.yyx) - sdGlass(p-e.yyx)));
}

// water level in WORLD space — a calm horizon meter: the letters rock,
// the waterline barely breathes and always shows the level
float lvl(float x){
  return -0.012
       + 0.0032 * sin(x * 6.0 - uTime * 1.5)
       + 0.0018 * sin(x * 11.0 + uTime * 2.1)
       + uKick * 0.010 * sin(x * 6.0 - uTime * 7.0);
}

// environment: cool studio, two soft windows
vec3 env(vec3 rd){
  float h = rd.y;
  float ang = atan(rd.z, rd.x);
  vec3 col = mix(vec3(0.010,0.014,0.022), vec3(0.10,0.13,0.18), smoothstep(-0.3,0.8,h));
  float b1 = smoothstep(0.80,0.97,cos(ang-0.9))*smoothstep(0.0,0.6,h);
  float b2 = smoothstep(0.86,0.99,cos(ang+2.3))*smoothstep(-0.5,0.0,h);
  col += vec3(0.95,0.97,1.0)*b1*2.6;
  col += vec3(0.35,0.55,0.8)*b2*1.4;
  col += vec3(0.9,0.95,1.0)*smoothstep(0.75,0.97,h)*0.8;
  // frontal softbox so the glass always carries a sheen
  col += vec3(0.75,0.82,0.95)*smoothstep(0.55,0.95,rd.z)*1.1;
  return col;
}

void main(){
  vec2 uv = (2.0*gl_FragCoord.xy - uRes)/uRes.y;
  float t = uTime;

  // camera
  vec3 ro = vec3(0.0, 0.08, 2.3);
  vec3 fw = normalize(vec3(0.0, -0.03, 0.0) - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0,1.0,0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(fw*1.75 + rt*uv.x + up*uv.y);

  // march to the glass
  float s = 0.0; float d;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    d = sdGlass(ro + rd*s);
    if (d < 0.0009*max(s,1.0)) { hit = true; break; }
    s += d*0.78;
    if (s > 7.0) break;
  }

  vec3 col;
  if (!hit) {
    col = env(rd) * 0.55;
  } else {
    vec3 p = ro + rd*s;
    vec3 n = calcN(p);
    float fres = 0.07 + 0.93*pow(1.0 - max(dot(n,-rd),0.0), 3.2);
    vec3 refl = env(reflect(rd, n));

    vec3 rr = refract(rd, n, 0.75);
    if (dot(rr,rr) < 0.001) rr = reflect(rd, n);

    // walk the interior: find the exit, measure the flooded stretch,
    // catch the waterline crossing and the bubbles
    float inside = 0.0, wet = 0.0;
    float STEP = 0.05;
    vec3 q = p + rr * 0.01;
    float men = 0.0;
    float bubGlow = 0.0;
    float prevBelow = (q.y < lvl(q.x)) ? 1.0 : 0.0;
    for (int i = 0; i < 14; i++) {
      if (sdGlass(q) > 0.004) break;
      float below = (q.y < lvl(q.x)) ? 1.0 : 0.0;
      if (below != prevBelow) men = 1.0;
      prevBelow = below;
      inside += STEP;
      wet += STEP * below;
      for (int b = 0; b < 6; b++) {
        vec4 bb = uBub[b];
        bubGlow += smoothstep(bb.w, bb.w*0.3, length(q - bb.xyz)) * 0.5;
      }
      q += rr * STEP;
    }
    // exit into the environment
    vec3 inner = env(rr) * 1.2 + vec3(0.03,0.045,0.06);
    // water tint over the flooded stretch
    vec3 absorb = exp(-wet * vec3(6.5, 2.2, 1.1));
    inner *= absorb;
    // water gives back a cool glow
    inner += vec3(0.05, 0.28, 0.35) * (1.0 - absorb) * 1.2;
    // caustic shimmer in the wet glass
    float ca = vnoise(vec2(p.x*8.0 + t*0.5, p.y*10.0 - t*0.3));
    inner += vec3(0.25,0.6,0.65) * pow(smoothstep(0.6,0.95,ca),2.0) * smoothstep(0.02,0.2,wet) * 0.6;
    // bubbles sparkle
    inner += vec3(0.7,0.95,1.0) * min(bubGlow, 1.2) * 0.5;
    // the meniscus fires where the ray crossed the surface
    inner += vec3(0.75,0.98,1.0) * men * (0.35 + 0.3*sin(p.x*24.0 + t*3.0));

    col = mix(inner, refl, fres);
    // sun-streak speculars
    vec3 l1 = normalize(vec3(0.5, 0.75, 0.55));
    col += vec3(1.0,0.98,0.92) * pow(max(dot(reflect(rd,n), l1), 0.0), 90.0) * 1.6;
    vec3 l2 = normalize(vec3(-0.6, 0.1, 0.7));
    col += vec3(0.5,0.75,1.0) * pow(max(dot(reflect(rd,n), l2), 0.0), 40.0) * 0.5;
  }

  // vignette + grain
  vec2 cu = uv*0.5;
  col *= 1.0 - 0.3*dot(cu,cu);
  col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.02;

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
  dist: gl.getUniformLocation(prog, "uDist"),
  rot: gl.getUniformLocation(prog, "uRot"),
  slosh: gl.getUniformLocation(prog, "uSlosh"),
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
  mx = (e.clientX / width - 0.5) * 2
  my = (e.clientY / height - 0.5) * 2
  lastMX = mx
})
window.addEventListener("mousedown", () => { kick = 1 })

// -- bubbles (world space, rise through the flooded strokes) -----------------------------------

const NB = 6
const bub = new Float32Array(NB * 4)
const bubV = new Float32Array(NB)
function respawn(i) {
  bub[i * 4] = (Math.random() - 0.5) * 2.0
  bub[i * 4 + 1] = -0.28 - Math.random() * 0.08
  bub[i * 4 + 2] = (Math.random() - 0.5) * 0.06
  bub[i * 4 + 3] = 0.008 + Math.random() * 0.012
  bubV[i] = 0.04 + Math.random() * 0.05
}
for (let i = 0; i < NB; i++) { respawn(i); bub[i * 4 + 1] = -0.25 + Math.random() * 0.2 }

// -- loop --------------------------------------------------------------------------------------

let t = 0
let last = performance.now()

function step(dt) {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  t += dt

  smx += (mx - smx) * Math.min(1, dt * 5)
  smy += (my - smy) * Math.min(1, dt * 5)

  kick *= Math.exp(-dt * 2.2)

  for (let i = 0; i < NB; i++) {
    bub[i * 4 + 1] += bubV[i] * dt
    bub[i * 4] += Math.sin(t * 2.5 + i * 2.1) * 0.005 * dt * 60
    if (bub[i * 4 + 1] > -0.014) respawn(i)
  }

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, distTex)
  gl.uniform1i(U.dist, 0)
  gl.uniform2f(U.res, width, height)
  gl.uniform1f(U.time, t)
  gl.uniform2f(U.rot, smx * 0.32 + Math.sin(t * 0.28) * 0.10, -smy * 0.16)
  gl.uniform1f(U.slosh, 0)
  gl.uniform1f(U.kick, kick)
  gl.uniform4fv(U.bub, bub)
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
  set rotx(v) { smx = mx = v }, set roty(v) { smy = my = v },
  set tilt(v) { tilt = v }, set kick(v) { kick = v },
  step
}
