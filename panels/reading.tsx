import type { PanelDef } from "@/config/panels";
import { NoData, PanelShell } from "@/components/ui";
import { loadPanelData } from "@/lib/data";
import { parseReading } from "@/lib/schema";

export default async function Reading({ def }: { def: PanelDef }) {
  const data = await loadPanelData("reading", parseReading);
  if (!data) return <PanelShell def={def}><NoData /></PanelShell>;
  return (
    <PanelShell def={def} kicker="Saved links · fictional">
      <ul className="rise flex flex-col gap-3">
        {data.items.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="glass flex flex-col gap-1 p-4">
              <span className="tech text-[var(--accent-2)]">
                {r.tag} · {r.minutes} min
              </span>
              <span className="font-semibold leading-snug">{r.title}</span>
              <span className="text-xs text-muted">{r.source} ↗</span>
            </a>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}
