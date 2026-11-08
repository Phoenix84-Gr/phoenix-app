import type { PanelDef } from "@/config/panels";
import { NoData, PanelShell, Progress, Section, Sparkline } from "@/components/ui";
import { loadPanelData } from "@/lib/data";
import { parseTraining } from "@/lib/schema";

export default async function Training({ def }: { def: PanelDef }) {
  const data = await loadPanelData("training", parseTraining);
  if (!data) return <PanelShell def={def}><NoData /></PanelShell>;
  const done = data.sessions.filter((s) => s.done).reduce((m, s) => m + s.minutes, 0);
  const pct = Math.round((done / Math.max(1, data.goalMinutes)) * 100);
  return (
    <PanelShell def={def} kicker={`${data.week} · fictional`}>
      <section className="rise glass flex flex-col gap-3 p-5" aria-label="Weekly goal">
        <div className="flex items-baseline justify-between">
          <span className="tech text-muted">Weekly goal</span>
          <span className="text-sm text-muted">
            {done} / {data.goalMinutes} min
          </span>
        </div>
        <p className="text-4xl font-semibold">{pct}%</p>
        <Progress value={pct} label="Weekly goal" />
      </section>
      <Section title="Sessions">
        <div className="glass flex flex-col divide-y divide-white/10">
          {data.sessions.map((s) => (
            <div key={`${s.day}-${s.type}`} className="flex items-center gap-3 px-4 py-3">
              <span className={s.done ? "text-[var(--good)]" : "text-muted"} aria-label={s.done ? "done" : "planned"}>
                {s.done ? "●" : "○"}
              </span>
              <span className="tech w-10 shrink-0">{s.day}</span>
              <span className="flex-1">{s.type}</span>
              <span className="text-sm text-muted">{s.minutes} min</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Lifts">
        <div className="grid grid-cols-1 gap-3">
          {data.lifts.map((l) => (
            <div key={l.name} className="glass flex items-center justify-between gap-3 p-4">
              <div className="flex flex-col gap-1">
                <span className="tech text-muted">{l.name}</span>
                <span className="text-2xl font-semibold">
                  {l.history[l.history.length - 1]} {l.unit}
                </span>
              </div>
              <Sparkline values={l.history} label={`${l.name} progress`} width={140} height={44} />
            </div>
          ))}
        </div>
      </Section>
    </PanelShell>
  );
}
