"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Orb, { type OrbSignal } from "./orb";
import AthenaFace from "./athena-face";
import Icon from "./icons";
import { arcLayout, project } from "@/lib/arc";
import { PANELS } from "@/config/panels";
import { SITE, type ThemeName } from "@/config/site";

/** Home: the orb fills the screen. One tap: it glides into the bottom half and the arc menu appears above it.
 *  Tap again: back. Double tap: the assistant. The menu is built from config/panels.ts. */
const THEME_LABEL: Record<ThemeName, { name: string; icon: string }> = {
  space: { name: "Space", icon: "🌌" },
  ocean: { name: "Ocean", icon: "🌊" },
};
const N = PANELS.length;
const STEP_PX = 92; // drag distance for one item
const DOUBLE_MS = 260; // double-tap window

export default function Home({ initialTheme, initialMenu = false }: { initialTheme: ThemeName; initialMenu?: boolean }) {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [menu, setMenu] = useState(initialMenu);
  const [pressed, setPressed] = useState(false);
  const signal = useRef<OrbSignal>({ mode: "idle", level: 0 });
  const tapTimer = useRef(0);

  useEffect(() => () => clearTimeout(tapTimer.current), []);
  useEffect(() => {
    if (menu) PANELS.forEach((p) => p.status === "ready" && router.prefetch(`/${p.id}`));
  }, [menu, router]);

  // onClick fires for touch, mouse, keyboard (Enter/Space) and assistive technology alike
  function orbTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = 0;
      router.push("/assistant");
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = 0;
      setMenu((m) => !m);
    }, DOUBLE_MS);
  }

  function flipTheme() {
    const next: ThemeName = theme === "space" ? "ocean" : "space";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  }

  return (
    <main className="home fixed inset-0 overflow-hidden select-none" data-menu={menu ? "1" : "0"}>
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),16px)]">
        <span className="tech glass flex items-center gap-2 rounded-full px-3 py-2 text-[var(--accent-2)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" aria-hidden /> {SITE.name} · {THEME_LABEL[theme].name}
        </span>
        <button onClick={flipTheme} className="glass h-11 w-11 rounded-full text-lg" aria-label={`Theme: ${THEME_LABEL[theme].name}. Switch`}>
          {THEME_LABEL[theme].icon}
        </button>
      </header>

      <button
        type="button"
        className="orb-stage"
        data-pressed={pressed ? "1" : "0"}
        aria-label={menu ? "Close the menu. Double tap for the assistant" : "Open the menu. Double tap for the assistant"}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onClick={orbTap}
      >
        <span className="orb-glow" aria-hidden />
        {theme === "space" ? <AthenaFace signal={signal} className="orb-canvas" /> : <Orb key={theme} theme={theme} signal={signal} className="orb-canvas" />}
      </button>

      {menu && <ArcMenu onOpen={(href) => router.push(href)} />}

      {!menu && (
        <footer className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-5 pb-[max(env(safe-area-inset-bottom),24px)] text-center">
          <h1 className="text-[26px] font-semibold tracking-tight">{SITE.tagline}</h1>
          <p className="text-xs tracking-wide text-muted opacity-80">Tap {theme === "space" ? SITE.assistantName : "the orb"} for the menu · double tap to chat</p>
        </footer>
      )}
    </main>
  );
}

/** The elliptical arc: drag with momentum, snap to the nearest item, tap the front one to open it. */
function ArcMenu({ onOpen }: { onOpen: (href: string) => void }) {
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const anim = useRef(0);
  const drag = useRef<{ x: number; start: number; t: number; v: number; moved: boolean; hit: number } | null>(null);
  const [w, setW] = useState(390);

  useEffect(() => {
    const fit = () => setW(Math.min(window.innerWidth, 520));
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(anim.current);
    };
  }, []);

  const set = (p: number) => {
    posRef.current = p;
    setPos(p);
  };
  function settle(target: number) {
    cancelAnimationFrame(anim.current);
    const tick = () => {
      const d = target - posRef.current;
      if (Math.abs(d) < 0.002) return set(target);
      set(posRef.current + d * 0.16); // critically damped glide, no bounce
      anim.current = requestAnimationFrame(tick);
    };
    tick();
  }

  const front = ((Math.round(pos) % N) + N) % N;
  const item = PANELS[front];

  return (
    <section
      className="arc absolute inset-x-0 top-0 z-20 h-[52dvh] touch-none"
      aria-label="Menu"
      onPointerDown={(e) => {
        cancelAnimationFrame(anim.current);
        // read the touched bubble now: after setPointerCapture every later event targets the section itself
        const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
        drag.current = { x: e.clientX, start: posRef.current, t: performance.now(), v: 0, moved: false, hit: hit ? Number(hit.dataset.i) : -1 };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 8) d.moved = true;
        const now = performance.now();
        const p = d.start - dx / STEP_PX;
        d.v = ((p - posRef.current) / Math.max(1, now - d.t)) * 1000; // items per second
        d.t = now;
        if (d.moved) set(p);
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        if (d.moved) return settle(Math.round(posRef.current + project(d.v)));
        if (d.hit < 0) return;
        const i = d.hit;
        const rel = (((i - posRef.current) % N) + N + N / 2) % N - N / 2;
        if (Math.abs(rel) < 0.5) {
          if (PANELS[i].status === "ready") onOpen(`/${PANELS[i].id}`);
        } else settle(posRef.current + rel);
      }}
    >
      <div className="absolute left-1/2 top-[44%]">
        {PANELS.map((p, i) => {
          const l = arcLayout(i, pos, N, w * 0.38, w * 0.13);
          const size = 112;
          const ready = p.status === "ready";
          return (
            <div
              key={p.id}
              data-i={i}
              className={`bubble glass absolute grid place-items-center rounded-full ${ready ? "" : "soon"}`}
              style={{
                width: size,
                height: size,
                zIndex: l.z,
                opacity: l.opacity * (ready ? 1 : 0.6),
                transform: `translate(${l.x - size / 2}px, ${l.y - size / 2}px) scale(${l.scale * (i === front ? 1.18 : 1)})`,
                filter: l.blur > 0.3 ? `blur(${l.blur.toFixed(1)}px)` : undefined,
              }}
              aria-hidden
            >
              <span className={i === front ? "text-[var(--accent-2)]" : "text-[var(--text)]"}>
                <Icon name={p.icon} size={30} />
              </span>
            </div>
          );
        })}
      </div>
      {/* the same menu as plain links for the keyboard and screen readers (the arc is pointer-only);
          hidden until a link gets focus, then shown as a list */}
      <nav
        className="sr-only focus-within:not-sr-only focus-within:glass focus-within:fixed focus-within:inset-x-4 focus-within:top-20 focus-within:z-50 focus-within:flex focus-within:flex-col focus-within:gap-2 focus-within:p-4"
        aria-label="Sections"
      >
        {PANELS.filter((p) => p.status === "ready").map((p) => (
          <a key={p.id} href={`/${p.id}`}>
            {p.title}
          </a>
        ))}
      </nav>
      <div className="absolute inset-x-0 top-[70%] flex flex-col items-center gap-1 px-6 text-center" aria-live="polite">
        <h1 className="text-[26px] font-semibold tracking-tight">{item.title}</h1>
        <p className="tech text-[var(--accent-2)]">{item.subtitle}</p>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {PANELS.map((p, i) => (
            <span key={p.id} className={`h-1.5 rounded-full transition-all ${i === front ? "w-6 bg-[var(--accent)]" : "w-1.5 bg-white/25"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
