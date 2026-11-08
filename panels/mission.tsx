import type { PanelDef } from "@/config/panels";
import { NoData, PanelShell, Progress, Section, Tile } from "@/components/ui";
import { loadPanelData } from "@/lib/data";
import { parseMission } from "@/lib/schema";

export default async function Mission({ def }: { def: PanelDef }) {
  const data = await loadPanelData("mission", parseMission);
  if (!data) return <PanelShell def={def}><NoData /></PanelShell>;
  return (
    <PanelShell def={def} kicker="Overview · fictional data">
      <section className="rise grid grid-cols-2 gap-3" aria-label="Status">
        {data.tiles.map((t) => (
          <Tile key={t.label} label={t.label} value={t.value} note={t.note} />
        ))}
      </section>
      <Section title="Projects">
        {data.projects.map((p) => (
          <article key={p.name} className="glass flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                <span aria-hidden>{p.emoji}</span> {p.name}
              </h3>
              {p.waitingOnYou && <span className="tech rounded-full bg-[var(--warn)]/15 px-2 py-1 text-[var(--warn)]">Your turn</span>}
            </div>
            <p className="text-sm">{p.status}</p>
            <Progress value={p.progress} label={`${p.name} progress`} />
            <p className="tech text-muted">Next · {p.next}</p>
          </article>
        ))}
      </Section>
      <p className="tech text-muted">Updated {new Date(data.updated).toUTCString().slice(5, 22)} UTC</p>
    </PanelShell>
  );
}
