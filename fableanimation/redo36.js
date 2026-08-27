// Spirale: the mark inside a chrome spring. A seven-turn coil winds itself
// around the extruded redo logotype — raymarched SDF chrome for both, the
// logo built from a signed-distance field of its own mask. Full cinema
// pipeline from the reference: HDR half-float targets, dual-Kawase bloom,
// depth of field, anamorphic streak, ACES, grain, chromatic aberration.
// Click reverses the winding and fires a pulse through the bloom.

const canvas = document.getElementById("scene_root")
const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false, alpha: false })

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

// -- shaders ---------------------------------------------------------------------------

const PRE = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`

const VS = `attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`

const SCENE_MATH = `
#define MAXD 9.0
#define TURNS 7.0
#define LW 2.3
#define LH 0.6291
#define TH 0.105
uniform vec2 uRes;
uniform float uTime, uWind, uMix, uPulse;
uniform vec2 uMouse;
uniform sampler2D uDist;

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

// signed distance to the logo silhouette in its own plane
float logoD2(vec2 xy){
  vec2 uv = xy / vec2(LW, LH) + 0.5;
  vec2 cl = clamp(uv, 0.0, 1.0);
  float d = (texture2D(uDist, cl).r * 255.0 - 128.0) / 160.0;
  return d + length((uv - cl) * vec2(LW, LH));
}

// extruded chrome mark
float sdLogo(vec3 p){
  p.xz = rot(0.20*sin(uTime*0.3)) * p.xz;   // gentle sway
  float d2 = logoD2(p.xy);
  float dz = abs(p.z) - TH;
  vec2 w = max(vec2(d2, dz), 0.0);
  return min(max(d2, dz), 0.0) + length(w) - 0.024;
}


vec2 map(vec3 p){
  vec2 res = vec2(sdLogo(p), 2.0);
  for(int i=0;i<6;i++){
    float fi = float(i);
    float w = uTime*(0.22 + 0.07*fi) + fi*1.0472;
    float rad = 2.25 + 0.30*fi;
    vec3 c = vec3(cos(w)*rad, sin(uTime*0.5 + fi*2.1)*0.5, sin(w)*rad*0.7);
    float dp = max(length(p - c) - (0.05 + 0.011*fi), 0.015);
    if(dp < res.x) res = vec2(dp, 3.0);
  }
  return res;
}

void cam(vec2 uv, out vec3 ro, out vec3 rd){
  float intro = 1.0 - exp(-uTime*0.55);
  float dist = mix(7.2, 3.55, intro);
  float ang = sin(uTime*0.16)*0.38 + uMouse.x*0.5;
  ro = vec3(sin(ang)*dist,
            0.30 + uMouse.y*0.8 + sin(uTime*0.14)*0.16,
            cos(ang)*dist);
  ro += vec3(sin(uTime*1.7), sin(uTime*2.3+1.7), cos(uTime*1.9))*0.02;
  vec3 fw = normalize(vec3(0.0, -0.02, 0.0) - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0,1.0,0.0)));
  vec3 up = cross(rt, fw);
  float roll = sin(uTime*0.10)*0.03;
  vec2 ruv = vec2(uv.x*cos(roll)-uv.y*sin(roll), uv.x*sin(roll)+uv.y*cos(roll));
  rd = normalize(fw*1.6 + rt*ruv.x + up*ruv.y);
}
`

const FS_DEPTH = PRE + `varying vec2 vUv;
` + SCENE_MATH + `
void main(){
  vec2 uv = (2.0*gl_FragCoord.xy - uRes)/uRes.y;
  vec3 ro, rd; cam(uv, ro, rd);
  float t = 0.0;
  for(int i=0;i<60;i++){
    float d = map(ro + rd*t).x;
    if(d < 0.0016*max(t,1.0) || t > MAXD) break;
    t += d*0.9;
  }
  float e = clamp(t, 0.0, MAXD)/16.0;
  gl_FragColor = vec4(floor(e*255.0)/255.0, fract(e*255.0), 0.0, 1.0);
}
`

const FS_SCENE = PRE + `varying vec2 vUv;
uniform float uEnc;
` + SCENE_MATH + `
float n21(vec2 p){ return fract(sin(dot(p, vec2(41.34, 289.13)))*43758.5453); }
float vno(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(n21(i), n21(i+vec2(1.0,0.0)), f.x),
             mix(n21(i+vec2(0.0,1.0)), n21(i+vec2(1.0,1.0)), f.x), f.y);
}

vec3 env(vec3 rd){
  float h = rd.y;
  float ang = atan(rd.z, rd.x);
  vec3 col = mix(vec3(0.015,0.020,0.035), vec3(0.28,0.34,0.44), smoothstep(-0.25,0.75,h));
  col += vec3(0.85,0.45,0.18)*pow(max(1.0-abs(h+0.05),0.0),6.0)*0.55;
  col += vec3(0.10,0.14,0.20)*pow(max(1.0-abs(h-0.10),0.0),3.0);
  float b1 = smoothstep(0.86,0.985,cos(ang-0.9))*smoothstep(0.05,0.65,h);
  float b2 = smoothstep(0.90,0.995,cos(ang+2.4))*smoothstep(-0.55,-0.05,h);
  float b3 = smoothstep(0.93,0.999,cos(ang-2.8))*smoothstep(0.20,0.80,h);
  col += vec3(1.00,0.93,0.82)*b1*4.0;
  col += vec3(0.55,0.72,1.00)*b2*2.2;
  col += vec3(0.90,0.85,1.00)*b3*1.6;
  col += vec3(1.00,0.98,0.95)*smoothstep(0.72,0.96,h)*1.8;
  float neb = vno(rd.xy*3.5 + rd.z*2.0)*0.6 + vno(rd.yz*4.5 - rd.x)*0.4;
  col += vec3(0.20,0.30,0.45)*neb*smoothstep(0.0,0.8,abs(rd.y)+0.15)*0.35;
  return col;
}

vec3 calcN(vec3 p){
  vec2 e = vec2(0.006, 0.0);
  return normalize(vec3(
    map(p+e.xyy).x - map(p-e.xyy).x,
    map(p+e.yxy).x - map(p-e.yxy).x,
    map(p+e.yyx).x - map(p-e.yyx).x));
}

vec2 marchS(vec3 ro, vec3 rd, out float glow){
  float t = 0.0; glow = 0.0; float id = 0.0;
  for(int i=0;i<70;i++){
    vec3 p = ro + rd*t;
    vec2 h = map(p);
    glow += exp(-h.x*8.0)*0.014/(1.0 + t*0.6);
    if(h.x < 0.0016*max(t,1.0) || t > MAXD){ id = h.y; break; }
    t += h.x*0.85;
    id = h.y;
  }
  return vec2(t, id);
}

vec3 chrome(vec3 p, vec3 rd, float id){
  vec3 n = calcN(p);
  vec3 r = reflect(rd, n);
  vec3 col = env(r)*vec3(0.93,0.96,1.0);
  if(id > 1.5 && id < 2.5) col = env(r)*vec3(1.02,0.97,0.90);  // the mark is a warmer chrome
  float fr = pow(1.0 - max(dot(n,-rd),0.0), 3.0);
  col *= 0.85 + 0.40*fr;
  vec3 l1 = normalize(vec3( 0.55,0.75,-0.35));
  vec3 l2 = normalize(vec3(-0.60,0.20, 0.60));
  col += pow(max(dot(r,l1),0.0),80.0)*vec3(1.0,0.90,0.75)*2.4;
  col += pow(max(dot(r,l2),0.0),30.0)*vec3(0.5,0.70,1.0)*0.8;
  return col;
}

vec3 fogCol(vec3 rd){
  vec3 c = mix(vec3(0.030,0.042,0.066), vec3(0.085,0.110,0.160), smoothstep(-0.4,0.6,rd.y));
  c += vec3(0.55,0.30,0.12)*pow(max(1.0-abs(rd.y+0.10),0.0),5.0)*0.35;
  return c;
}

void main(){
  vec2 uv = (2.0*gl_FragCoord.xy - uRes)/uRes.y;
  vec3 ro, rd; cam(uv, ro, rd);

  float glow;
  vec2 hit = marchS(ro, rd, glow);
  float t = hit.x, id = hit.y;
  vec3 fc = fogCol(rd);
  vec3 col;

  float floorY = -1.05;
  float tf = rd.y < 0.0 ? (ro.y - floorY)/(-rd.y) : MAXD + 1.0;

  if(t < MAXD && t < tf){
    vec3 p = ro + rd*t;
    col = chrome(p, rd, id);
    col = mix(col, fc, 1.0 - exp(-t*t*0.028));
  } else if(tf <= MAXD){
    vec3 p = ro + rd*tf;
    vec3 rr = vec3(rd.x, -rd.y, rd.z);
    float g2;
    vec2 h2 = marchS(p + vec3(0.0,0.004,0.0), rr, g2);
    vec3 refl;
    if(h2.x < MAXD){
      vec3 hp = p + rr*h2.x + vec3(0.0,0.003,0.0);
      refl = chrome(hp, rr, h2.y);
      refl = mix(refl, fc, 1.0 - exp(-h2.x*h2.x*0.05));
    } else {
      refl = env(rr);
    }
    float fres = 0.30 + 0.70*pow(1.0 - max(dot(vec3(0.0,1.0,0.0), -rd), 0.0), 3.0);
    col = mix(vec3(0.020,0.024,0.032), refl, fres*0.92);
    col += vec3(0.90,0.50,0.15)*exp(-abs(length(p.xz)-1.6)*2.0)*0.12*(0.6 + 1.6*uPulse);
    float rip = (1.0-uPulse)*4.5;
    col += vec3(0.8,0.55,0.25)*exp(-abs(length(p.xz)-rip)*4.0)*uPulse*0.8;
    col = mix(col, fc, 1.0 - exp(-tf*tf*0.030));
  } else {
    col = env(rd);
  }

  vec3 glowC = mix(vec3(1.0,0.58,0.16), vec3(0.42,0.72,1.0), 0.5 + 0.5*sin(uTime*0.21));
  col += glow*glowC*(0.8 + 2.4*uPulse);
  col = uEnc > 0.5 ? col/(1.0+col) : col;
  gl_FragColor = vec4(col, 1.0);
}
`

const FS_DOF = PRE + `varying vec2 vUv;
uniform sampler2D uScene, uDepth;
uniform vec2 uTexel;
uniform float uFocus, uMaxCoc, uTaps;
float unpackD(vec2 p){ return (p.x + p.y/255.0)*16.0; }
float cocF(float t){ return uMaxCoc*clamp(abs(t-uFocus)*1.15/max(t,0.45), 0.0, 1.0); }
void main(){
  vec3 ctr = texture2D(uScene, vUv).rgb;
  float dc = unpackD(texture2D(uDepth, vUv).xy);
  float cocC = cocF(dc);
  vec3 acc = ctr*1.6; float ws = 1.6;
  for(int i=0;i<24;i++){
    if(float(i) >= uTaps) break;
    float fi = float(i)+0.5;
    float rr = sqrt(fi/uTaps);
    float aa = fi*2.39996323;
    vec2 off = vec2(cos(aa), sin(aa))*rr*uMaxCoc*uTexel;
    float ds = unpackD(texture2D(uDepth, vUv+off).xy);
    float cs = cocF(ds);
    float l = length(off/uTexel);
    float w = smoothstep(l+1.5, l-1.5, cs);
    if(ds < dc-0.3) w *= 0.35;
    acc += texture2D(uScene, vUv+off).rgb*w;
    ws += w;
  }
  vec3 outc = mix(acc/ws, ctr, 1.0 - smoothstep(0.25, 2.2, cocC));
  gl_FragColor = vec4(outc, 1.0);
}
`

const FS_BRIGHT = PRE + `varying vec2 vUv;
uniform sampler2D uTex;
uniform float uEnc, uThresh, uScale;
void main(){
  vec3 c = texture2D(uTex, vUv).rgb;
  vec3 m = min(c, vec3(0.996));
  vec3 h = uEnc > 0.5 ? m/(vec3(1.0)-m) : c;
  float l = dot(h, vec3(0.2126,0.7152,0.0722));
  gl_FragColor = vec4(h*smoothstep(uThresh, uThresh+1.8, l)*uScale, 1.0);
}
`

const FS_KAWASE = PRE + `varying vec2 vUv;
uniform sampler2D uTex, uAdd;
uniform vec2 uTexel;
uniform float uPx, uAddMix;
void main(){
  vec2 o = (uPx+0.5)*uTexel;
  vec3 c = 0.25*(
    texture2D(uTex, vUv+vec2(-o.x,-o.y)).rgb +
    texture2D(uTex, vUv+vec2( o.x,-o.y)).rgb +
    texture2D(uTex, vUv+vec2(-o.x, o.y)).rgb +
    texture2D(uTex, vUv+vec2( o.x, o.y)).rgb);
  c += texture2D(uAdd, vUv).rgb*uAddMix;
  gl_FragColor = vec4(c, 1.0);
}
`

const FS_STREAK = PRE + `varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uSpread;
void main(){
  vec3 acc = vec3(0.0); float ws = 0.0;
  for(int i=-9;i<=9;i++){
    float w = exp(-abs(float(i))*0.32);
    acc += texture2D(uTex, vUv + vec2(float(i)*uSpread*uTexel.x, 0.0)).rgb*w;
    ws += w;
  }
  gl_FragColor = vec4(acc/ws, 1.0);
}
`

const FS_COMPOSITE = PRE + `varying vec2 vUv;
uniform sampler2D uScene, uBloom, uStreak;
uniform float uEnc, uBloomGain, uStreakGain, uCA, uExposure, uRT, uFade;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){
  vec2 uv = vUv;
  vec2 d = (uv-0.5)*uCA;
  vec3 s;
  s.r = texture2D(uScene, uv+d).r;
  s.g = texture2D(uScene, uv).g;
  s.b = texture2D(uScene, uv-d).b;
  vec3 m = min(s, vec3(0.996));
  vec3 hdr = uEnc > 0.5 ? m/(vec3(1.0)-m) : s;
  hdr *= uExposure;
  hdr += texture2D(uBloom, uv).rgb*uBloomGain;
  hdr += texture2D(uStreak, uv).rgb*uStreakGain*vec3(0.55,0.75,1.35);
  vec3 col = aces(hdr);
  vec2 cu = uv*2.0-1.0;
  col *= 1.0 - 0.30*smoothstep(0.5, 1.6, dot(cu,cu));
  float gr = fract(sin(dot(gl_FragCoord.xy + uRT*60.0, vec2(12.9898,78.233)))*43758.5453);
  col += (gr-0.5)*0.028;
  col = pow(col, vec3(0.90));
  gl_FragColor = vec4(col*uFade, 1.0);
}
`

// -- GL setup ----------------------------------------------------------------------------

function compile(type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src); gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s))
  return s
}
function makeProg(fsSrc) {
  const p = gl.createProgram()
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VS))
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc))
  gl.linkProgram(p)
  return p
}
const SRC = { depth: FS_DEPTH, scene: FS_SCENE, dof: FS_DOF, bright: FS_BRIGHT, kawase: FS_KAWASE, streak: FS_STREAK, composite: FS_COMPOSITE }
const P = {}
for (const n in SRC) P[n] = { prog: makeProg(SRC[n]), u: {} }
function U(p, name) { if (!(name in p.u)) p.u[name] = gl.getUniformLocation(p.prog, name); return p.u[name] }

gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
const aPos = gl.getAttribLocation(P.depth.prog, "aPos")
gl.enableVertexAttribArray(aPos)
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

const hfExt = gl.getExtension("OES_texture_half_float")
gl.getExtension("OES_texture_half_float_linear")
let HF = false
if (hfExt) {
  const tt = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tt)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, hfExt.HALF_FLOAT_OES, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  const tf = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, tf)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tt, 0)
  HF = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.deleteTexture(tt); gl.deleteFramebuffer(tf)
}
const ENC = HF ? 0 : 1

let T = {}
function mk(w, h, hdr) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, (hdr && HF) ? hfExt.HALF_FLOAT_OES : gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { tex, fbo, w, h }
}
function allocTargets() {
  for (const k in T) { gl.deleteTexture(T[k].tex); gl.deleteFramebuffer(T[k].fbo) }
  T = {}
  const w = canvas.width, h = canvas.height, M = n => Math.max(1, n)
  T.depth = mk(w, h, false)
  T.scene = mk(w, h, true)
  T.dof = mk(w, h, true)
  T.l0 = mk(M(w>>1), M(h>>1), true)
  T.l1 = mk(M(w>>2), M(h>>2), true)
  T.l2 = mk(M(w>>3), M(h>>3), true)
  T.l3 = mk(M(w>>4), M(h>>4), true)
  T.a2 = mk(M(w>>3), M(h>>3), true)
  T.a1 = mk(M(w>>2), M(h>>2), true)
  T.a0 = mk(M(w>>1), M(h>>1), true)
  T.streak = mk(M(w>>1), M(h>>1), true)
}
const black = mk(2, 2, false)
gl.bindFramebuffer(gl.FRAMEBUFFER, black.fbo)
gl.viewport(0, 0, 2, 2); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
gl.bindFramebuffer(gl.FRAMEBUFFER, null)

// -- the mark as a signed distance field --------------------------------------------------

const GW = 768, GH = 210
const distTex = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, distTex)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, GW, GH, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE,
  new Uint8Array(GW * GH).fill(254))     // far outside until the mask loads
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

    // two-pass chamfer signed distance transform
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

    const pxToWorld = 2.3 / GW           // LW world units over GW cells
    const out = new Uint8Array(GW * GH)
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x
      const d = (dOut[i] - dIn[i]) * pxToWorld
      // texture row 0 must be the BOTTOM of the mark (uv y up)
      out[(GH - 1 - y) * GW + x] = Math.max(1, Math.min(254, Math.round(128 + d * 160)))
    }
    gl.bindTexture(gl.TEXTURE_2D, distTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, GW, GH, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, out)
    URL.revokeObjectURL(url)
  }
  img.src = url
})

// -- state / input -------------------------------------------------------------------------

let animT = 0, wind = 0, mixT = 0, mixVal = 0, pulse = 0, dir = 1
let mx = 0, my = 0, smx = 0, smy = 0
let last = performance.now()
const dofTaps = 12

function resize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = Math.max(2, width)      // dpr locked to 1 for preview compositors
  canvas.height = Math.max(2, height)
  allocTargets()
}
resize()
addEventListener("resize", resize)

canvas.addEventListener("pointerdown", () => { dir *= -1; pulse = 1 })
addEventListener("pointermove", e => {
  mx = (e.clientX / width) * 2 - 1
  my = -((e.clientY / height) * 2 - 1)
})

// -- render passes ---------------------------------------------------------------------------

function bindT(t) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null)
  gl.viewport(0, 0, t ? t.w : canvas.width, t ? t.h : canvas.height)
}
function tex(unit, loc, target) {
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, target.tex)
  gl.uniform1i(loc, unit)
}
function quad() { gl.drawArrays(gl.TRIANGLES, 0, 3) }
function kawase(src, dst, px, add, addMix) {
  const p = P.kawase
  gl.useProgram(p.prog); bindT(dst)
  tex(0, U(p, "uTex"), src)
  tex(1, U(p, "uAdd"), add || black)
  gl.uniform2f(U(p, "uTexel"), 1 / src.w, 1 / src.h)
  gl.uniform1f(U(p, "uPx"), px)
  gl.uniform1f(U(p, "uAddMix"), addMix)
  quad()
}
function sceneUniforms(p) {
  gl.uniform2f(U(p, "uRes"), canvas.width, canvas.height)
  gl.uniform1f(U(p, "uTime"), animT)
  gl.uniform1f(U(p, "uWind"), wind)
  gl.uniform1f(U(p, "uMix"), mixVal)
  gl.uniform1f(U(p, "uPulse"), pulse)
  gl.uniform2f(U(p, "uMouse"), smx, smy)
  gl.activeTexture(gl.TEXTURE3)
  gl.bindTexture(gl.TEXTURE_2D, distTex)
  gl.uniform1i(U(p, "uDist"), 3)
}

function tick(now) {
  requestAnimationFrame(tick)
  const dt = Math.min((now - last) / 1000, 0.05); last = now

  animT += dt
  mixT += dt * 0.42
  mixVal = 0.5 - 0.5 * Math.cos(mixT)
  mixVal = mixVal * mixVal * (3 - 2 * mixVal)
  wind += dt * (1.1 + 3.2 * mixVal) * dir
  pulse *= Math.exp(-dt * 2.4)
  smx += (mx - smx) * Math.min(1, dt * 4)
  smy += (my - smy) * Math.min(1, dt * 4)

  const intro = 1 - Math.exp(-animT * 0.55)
  const focus = 7.2 + (3.55 - 7.2) * intro
  const maxCoc = Math.min(9, canvas.height * 0.0075)
  let f = Math.min(1, animT / 2.2); f = f * f * (3 - 2 * f)

  let p = P.depth
  gl.useProgram(p.prog); bindT(T.depth)
  sceneUniforms(p)
  quad()

  p = P.scene
  gl.useProgram(p.prog); bindT(T.scene)
  sceneUniforms(p)
  gl.uniform1f(U(p, "uEnc"), ENC)
  quad()

  p = P.dof
  gl.useProgram(p.prog); bindT(T.dof)
  tex(0, U(p, "uScene"), T.scene)
  tex(1, U(p, "uDepth"), T.depth)
  gl.uniform2f(U(p, "uTexel"), 1 / canvas.width, 1 / canvas.height)
  gl.uniform1f(U(p, "uFocus"), focus)
  gl.uniform1f(U(p, "uMaxCoc"), maxCoc)
  gl.uniform1f(U(p, "uTaps"), dofTaps)
  quad()

  p = P.bright
  gl.useProgram(p.prog); bindT(T.l0)
  tex(0, U(p, "uTex"), T.dof)
  gl.uniform1f(U(p, "uEnc"), ENC)
  gl.uniform1f(U(p, "uThresh"), 1.0)
  gl.uniform1f(U(p, "uScale"), 0.3)
  quad()

  p = P.streak
  gl.useProgram(p.prog); bindT(T.streak)
  tex(0, U(p, "uTex"), T.l0)
  gl.uniform2f(U(p, "uTexel"), 1 / T.l0.w, 1 / T.l0.h)
  gl.uniform1f(U(p, "uSpread"), 2.5)
  quad()

  kawase(T.l0, T.l1, 1.6, null, 0)
  kawase(T.l1, T.l2, 1.6, null, 0)
  kawase(T.l2, T.l3, 1.6, null, 0)
  kawase(T.l3, T.a2, 1.0, T.l2, 1)
  kawase(T.a2, T.a1, 1.0, T.l1, 1)
  kawase(T.a1, T.a0, 1.0, T.l0, 1)

  p = P.composite
  gl.useProgram(p.prog); bindT(null)
  tex(0, U(p, "uScene"), T.dof)
  tex(1, U(p, "uBloom"), T.a0)
  tex(2, U(p, "uStreak"), T.streak)
  gl.uniform1f(U(p, "uEnc"), ENC)
  gl.uniform1f(U(p, "uBloomGain"), 3.2)
  gl.uniform1f(U(p, "uStreakGain"), 0.9 + pulse * 1.6)
  gl.uniform1f(U(p, "uCA"), 0.0016 + pulse * 0.004)
  gl.uniform1f(U(p, "uExposure"), 1.15)
  gl.uniform1f(U(p, "uRT"), now / 1000)
  gl.uniform1f(U(p, "uFade"), f)
  quad()
}
requestAnimationFrame(tick)

window.__fable = {
  get t() { return animT },
  set t(v) { animT = v },
  set wind(v) { wind = v },
  set mix(v) { mixT = v },
  set pulse(v) { pulse = v }
}
