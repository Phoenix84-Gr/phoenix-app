"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PFRAG, PVERT, targets, type OrbSignal } from "./orb";

/** Athena's face in the Space theme: one still portrait (public/athena.webp, made with an image model for this
 *  project) brought to life by a shader. The lips part with the voice level a future voice feature would set, the
 *  circuit lines glow, she blinks every few seconds, and the face is a gently domed surface that tilts in 3D toward
 *  the finger, the mouse or the phone's tilt. The dust halo is the orb's. Reduced motion: still face, glow only.
 *  Feature positions are measured on the 1024x1024 source (uv: x right, y up). */
const MOUTH = "vec2(0.5, 0.365)", EYE_L = "vec2(0.376, 0.572)", EYE_R = "vec2(0.62, 0.574)";

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  vec2 c = (uv - vec2(0.5, 0.52)) / vec2(0.3, 0.42);          // the head's ellipse
  float dome = max(0.0, 1.0 - dot(c, c));
  vec3 p = position + vec3(0.0, 0.0, 0.32 * sqrt(dome));      // a rounded head, so a tilt shows depth
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTex; uniform float uOpen, uGlow, uBlink, uScan;
varying vec2 vUv;
float ell(vec2 d, vec2 r){ return dot(d / r, d / r); }
void main(){
  vec2 uv = vUv;
  // lips: inside the mouth ellipse the picture is stretched away from the lip line → the mouth opens
  vec2 dm = uv - ${MOUTH};
  float inMouth = 1.0 - smoothstep(0.55, 1.0, ell(dm, vec2(0.085, 0.05)));
  uv.y -= dm.y * uOpen * 0.55 * inMouth;
  // eyelids: a lid of her own cheek colour slides down from the top of each eye, shaded round, a lash at its edge
  float lid = 0.0, lash = 0.0; vec3 lidCol = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    vec2 e = i == 0 ? ${EYE_L} : ${EYE_R};
    vec2 de = vUv - e;
    float inEye = 1.0 - smoothstep(0.55, 1.0, ell(de, vec2(0.075, 0.04)));
    float lidY = 0.04 - 0.085 * uBlink;                          // the lid's edge, from the top of the eye down
    float covered = smoothstep(lidY - 0.005, lidY + 0.005, de.y) * inEye * step(0.01, uBlink);
    if (covered > lid) {
      lid = covered;
      lidCol = texture2D(uTex, e - vec2(0.0, 0.085)).rgb * (0.78 + 0.22 * smoothstep(-0.04, 0.04, de.y));
      lash = (1.0 - smoothstep(0.0, 0.006, abs(de.y - lidY))) * inEye;
    }
  }
  vec4 tex = texture2D(uTex, uv);
  vec3 col = mix(tex.rgb, lidCol, lid) * (1.0 - lash * 0.6 * step(0.01, uBlink));
  // the inside of an open mouth darkens along the lip line
  col *= 1.0 - uOpen * 0.7 * inMouth * (1.0 - smoothstep(0.0, 0.012 + uOpen * 0.02, abs(dm.y)));
  // the cyan circuits and the eyes: wherever blue outshines red, the voice adds light
  float cyan = smoothstep(0.2, 0.45, tex.b - tex.r) * smoothstep(0.45, 0.8, tex.b);   // not the bluish-white skin
  float scan = smoothstep(0.08, 0.0, abs(vUv.y - uScan)) * 0.6;   // thinking: a light band climbs the head
  col += vec3(0.25, 0.85, 1.0) * cyan * (uGlow * 0.9 + scan) * (1.0 - lid);
  // the black backdrop becomes transparent, so the page's own space shows round her
  float a = smoothstep(0.02, 0.12, max(max(tex.r, tex.g), tex.b));
  a *= 1.0 - smoothstep(0.42, 0.5, length((vUv - 0.5) * vec2(1.0, 0.9)));
  gl_FragColor = vec4(col, a);
}`;

export default function AthenaFace({ signal, className }: { signal: React.RefObject<OrbSignal>; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      el.dataset.face = "still";                 // no WebGL: the CSS background shows the still portrait
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.z = 4.2;

    // left in its own sRGB on purpose: a ShaderMaterial writes what it samples, so the portrait keeps its colours
    const tex = new THREE.TextureLoader().load("/athena.webp", () => { el.dataset.ready = "1"; });
    const u = { uTex: { value: tex }, uOpen: { value: 0 }, uGlow: { value: 0 }, uBlink: { value: 0 }, uScan: { value: -1 } };
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
    const geo = new THREE.PlaneGeometry(2, 2, 96, 96);              // 2 units in a 30° view at 4.2 → 89% of the stage
    const face = new THREE.Mesh(geo, mat);
    scene.add(face);

    // the orb's dust halo, wider and flatter round a face
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.95 + Math.pow(Math.random(), 2) * 0.5);
      pos.set([v.x, v.y, v.z * 0.4 - 0.3], i * 3);
      seed[i] = Math.random();
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pgeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const pu = { uTime: { value: 0 }, uBreath: { value: 0.03 }, uSize: { value: 4.5 },
      uColA: { value: new THREE.Color("#67e8f9") }, uColB: { value: new THREE.Color("#a78bfa") } };
    const pmat = new THREE.ShaderMaterial({ uniforms: pu, vertexShader: PVERT, fragmentShader: PFRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const dust = new THREE.Points(pgeo, pmat);
    dust.renderOrder = -1;
    scene.add(dust);

    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    // where she looks: the pointer anywhere on screen, or the phone's tilt; -1…1 on each axis
    const look = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => { look.x = (e.clientX / innerWidth) * 2 - 1; look.y = (e.clientY / innerHeight) * 2 - 1; };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      look.x = Math.max(-1, Math.min(1, e.gamma / 30));
      look.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));       // a phone held at ~45° looks straight on
    };
    if (!reduced) { addEventListener("pointermove", onPointer); addEventListener("deviceorientation", onTilt); }

    let level = 0, t = 0, last = performance.now(), raf = 0, nextBlink = 2.5, blinkAt = -1;
    const cur = { open: 0, glow: 0.15, rx: 0, ry: 0, breath: 0.03 };
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      const s = signal.current ?? { mode: "idle", level: 0 };
      const want = Math.max(0, Math.min(1, s.level));
      level += (want - level) * (1 - Math.exp(-dt / (want > level ? 0.03 : 0.12)));   // lips: fast attack, quick release
      const tg = targets(reduced ? "idle" : s.mode, level);
      const k = 1 - Math.exp(-dt / 0.25);
      const speaking = s.mode === "speaking";
      cur.open += ((speaking && !reduced ? Math.min(1, level * 1.6) : 0) - cur.open) * (1 - Math.exp(-dt / 0.05));
      cur.glow += (0.15 + (speaking ? level : s.mode === "listening" ? 0.35 : 0) - cur.glow) * k;
      cur.breath += (tg.breath - cur.breath) * k;
      cur.ry += (look.x * 0.28 - cur.ry) * (1 - Math.exp(-dt / 0.4));
      cur.rx += (look.y * 0.18 - cur.rx) * (1 - Math.exp(-dt / 0.4));
      if (!reduced && t > nextBlink) { blinkAt = t; nextBlink = t + 2.5 + Math.random() * 4; }
      const b = blinkAt < 0 ? 1 : (t - blinkAt) / 0.16;              // 160 ms: down, then up
      u.uBlink.value = b < 1 ? Math.sin(b * Math.PI) * 0.85 : 0;    // never quite shut: a painted lid looks flat closed
      u.uOpen.value = cur.open;
      u.uGlow.value = reduced ? want * 0.6 : cur.glow;
      u.uScan.value = s.mode === "thinking" && !reduced ? (t * 0.6) % 1.4 - 0.2 : -1;
      face.rotation.set(cur.rx, cur.ry, 0);
      face.position.y = reduced ? 0 : Math.sin(t * 0.8) * 0.015;     // she floats, barely
      pu.uTime.value = reduced ? 0 : t; // reduced motion: the halo stays still too
      pu.uBreath.value = cur.breath;
      if (!reduced) dust.rotation.y += dt * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("pointermove", onPointer);
      removeEventListener("deviceorientation", onTilt);
      geo.dispose(); mat.dispose(); tex.dispose(); pgeo.dispose(); pmat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [signal]);

  return <div ref={host} className={`athena-face ${className ?? ""}`} aria-hidden />;
}
