"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** The assistant's orb: a wireframe sphere with a dust halo, displaced by 3D noise. The render loop reads
 *  `signal` every frame (no React re-render per frame), so a future voice feature can move the surface.
 *  Without WebGL the CSS glow behind it still shows an orb. */
export type OrbMode = "idle" | "listening" | "thinking" | "speaking";
export type OrbSignal = { mode: OrbMode; level: number };
export type OrbTheme = "space" | "ocean";

// Simplex 3D noise — Ashima Arts / Stefan Gustavson (MIT), the standard compact GLSL version.
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERT = /* glsl */ `
uniform float uTime, uAmp, uFine, uTwist, uInward;
varying vec3 vPos; varying vec3 vNormal; varying vec2 vUv; varying float vDisp;
${NOISE}
void main(){
  vec3 p = position;
  float a = uTwist * p.y;                                   // thinking: the folds rotate round the sphere
  p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
  vec3 flow = normalize(p) * uInward * uTime;               // listening: waves travel toward the centre
  float big = snoise(p * 1.4 + vec3(0.0, 0.0, uTime * 0.22) + flow);
  float fine = snoise(p * 4.8 + vec3(uTime * 0.9));
  float d = big * uAmp + fine * uFine;
  vec3 displaced = position * (1.0 + d);
  vPos = position; vUv = uv; vDisp = d;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float uGlow; uniform vec3 uColA, uColB;
varying vec3 vPos; varying vec3 vNormal; varying vec2 vUv; varying float vDisp;
void main(){
  float fres = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
  float diag = clamp((vPos.x - vPos.y) * 0.35 + 0.5, 0.0, 1.0);   // top-left → bottom-right
  vec2 g = vUv * vec2(120.0, 60.0);                                // the fine fabric grid
  vec2 f = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1.0 - min(min(f.x, f.y), 1.0);
  vec3 col = mix(uColA, uColB, diag);
  float fold = smoothstep(0.02, 0.16, -vDisp) + smoothstep(0.55, 1.0, diag) * 0.6;   // light pools in folds
  col = mix(col, vec3(1.0, 0.92, 1.0), line * 0.35);
  float alpha = line * (0.5 + fres * 0.5 + fold * 0.4) + fres * 0.18 + fold * 0.12;
  gl_FragColor = vec4(col * (1.0 + fold * 0.8 + uGlow * 0.6), clamp(alpha * (0.85 + uGlow * 0.4), 0.0, 1.0));
}`;

// the dust halo
export const PVERT = /* glsl */ `
uniform float uTime, uBreath, uSize; attribute float aSeed; varying float vA; varying float vDiag;
void main(){
  vec3 p = position * (1.0 + uBreath * (0.4 + aSeed));                 // the halo breathes out on loud moments
  float a = uTime * 0.05 * (0.5 + aSeed);
  p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.6 + aSeed) * (3.0 / -mv.z);
  vA = 0.35 + 0.65 * fract(aSeed * 7.13 + uTime * 0.1);
  vDiag = clamp((position.x - position.y) * 0.3 + 0.5, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

export const PFRAG = /* glsl */ `
uniform vec3 uColA, uColB; varying float vA; varying float vDiag;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(mix(uColA, uColB, vDiag), vA * smoothstep(0.5, 0.0, d));
}`;

const LOOK: Record<OrbTheme, { a: string; b: string; pa: string; pb: string; dust: number }> = {
  ocean: { a: "#1e4bff", b: "#ff2bd6", pa: "#3d7bff", pb: "#ff3fe0", dust: 2400 },
  space: { a: "#22d3ee", b: "#7c3aed", pa: "#67e8f9", pb: "#a78bfa", dust: 2600 },
};

// per-mode targets; the loop eases toward them so every change is smooth and interruptible
export function targets(mode: OrbMode, level: number) {
  switch (mode) {
    case "listening": return { amp: 0.07 + level * 0.12, fine: 0.01 + level * 0.02, twist: 0, inward: 0.6, breath: -0.04, glow: 0.3 };
    case "thinking": return { amp: 0.08, fine: 0.012, twist: 0.9, inward: 0, breath: 0.03, glow: 0.2 };
    case "speaking": return { amp: 0.07 + level * 0.3, fine: 0.012 + level * 0.05, twist: 0, inward: 0, breath: 0.04 + level * 0.3, glow: level };
    default: return { amp: 0.06, fine: 0.006, twist: 0, inward: 0, breath: 0.03, glow: 0 };
  }
}

export default function Orb({ theme, signal, className }: { theme: OrbTheme; signal: React.RefObject<OrbSignal>; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      el.dataset.fallback = "1";               // no WebGL: the CSS glow behind still shows an orb
      return;
    }
    const look = LOOK[theme];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.z = 5.4;

    const u = {
      uTime: { value: 0 }, uAmp: { value: 0.06 }, uFine: { value: 0 }, uTwist: { value: 0 }, uInward: { value: 0 },
      uGlow: { value: 0 }, uColA: { value: new THREE.Color(look.a) }, uColB: { value: new THREE.Color(look.b) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const geo = new THREE.SphereGeometry(1, 160, 96);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = -0.35;
    scene.add(mesh);

    // dust halo: denser near the surface, fading outward
    const n = look.dust;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(1.12 + Math.pow(Math.random(), 2.2) * 0.42);
      pos.set([v.x, v.y, v.z], i * 3);
      seed[i] = Math.random();
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pgeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const pu = {
      uTime: u.uTime, uBreath: { value: 0.03 }, uSize: { value: 5.5 },
      uColA: { value: new THREE.Color(look.pa) }, uColB: { value: new THREE.Color(look.pb) },
    };
    const pmat = new THREE.ShaderMaterial({ uniforms: pu, vertexShader: PVERT, fragmentShader: PFRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    scene.add(new THREE.Points(pgeo, pmat));

    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    // smoothed state: attack ≈ 40 ms, release ≈ 200 ms on the voice level; ≈ 0.5 s on mode changes
    let level = 0, t = 0, last = performance.now(), raf = 0;
    const cur = targets("idle", 0);
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = signal.current ?? { mode: "idle", level: 0 };
      const want = reduced ? 0 : Math.max(0, Math.min(1, s.level));
      level += (want - level) * (1 - Math.exp(-dt / (want > level ? 0.04 : 0.2)));
      const tg = targets(reduced ? "idle" : s.mode, level);
      const k = 1 - Math.exp(-dt / 0.5);
      (Object.keys(cur) as (keyof typeof cur)[]).forEach((key) => { cur[key] += (tg[key] - cur[key]) * k; });
      if (!reduced) t += dt;
      u.uTime.value = t;
      u.uAmp.value = cur.amp;
      u.uFine.value = cur.fine;
      u.uTwist.value = cur.twist;
      u.uInward.value = cur.inward;
      u.uGlow.value = reduced ? Math.min(1, s.level) * 0.6 : cur.glow;   // reduced motion: glow only
      pu.uBreath.value = cur.breath;
      if (!reduced) mesh.rotation.y += dt * 0.06;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose(); mat.dispose(); pgeo.dispose(); pmat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme, signal]);

  return <div ref={host} className={className} aria-hidden />;
}
