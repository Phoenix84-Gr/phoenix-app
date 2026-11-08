import Link from "next/link";
import type { ReactNode } from "react";
import type { PanelDef } from "@/config/panels";

/** Shared building blocks for panels. A new panel should be made of these so it looks like the rest. */
export function PanelShell({ def, kicker, children, wide = false }: { def: PanelDef; kicker?: string; children: ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto flex w-full ${wide ? "max-w-2xl" : "max-w-md"} flex-1 flex-col gap-5 px-5 pb-16 pt-[max(env(safe-area-inset-top),32px)]`}>
      <Link href="/?menu=1" className="text-sm text-muted">
        ← Menu
      </Link>
      <div className="rise">
        <p className="tech text-[var(--accent-2)]">{kicker ?? def.subtitle}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{def.title}</h1>
      </div>
      {children}
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rise flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">{title}</h2>
      {children}
    </section>
  );
}

export function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "good" | "bad" | "warn" }) {
  const color = tone ? `text-[var(--${tone})]` : "";
  return (
    <div className="glass flex flex-col gap-1 p-4">
      <span className="tech text-muted">{label}</span>
      <span className={`text-2xl font-semibold ${color}`}>{value}</span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: "linear-gradient(90deg, var(--glow-1), var(--accent-2))" }} />
    </div>
  );
}

/** A small line chart as inline SVG: no chart library, nothing loaded from the network. */
export function Sparkline({ values, label, width = 120, height = 36 }: { values: number[]; label: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`);
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline points={points.join(" ")} fill="none" stroke={up ? "var(--good)" : "var(--bad)"} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function NoData() {
  return (
    <div className="glass p-5 text-muted">
      No data for this panel. The data source returned nothing, or the data did not pass its checks (see the server log).
    </div>
  );
}
