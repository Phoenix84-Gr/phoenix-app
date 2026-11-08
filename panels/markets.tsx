import type { PanelDef } from "@/config/panels";
import { NoData, PanelShell, Section, Sparkline, Tile } from "@/components/ui";
import { loadPanelData } from "@/lib/data";
import { parseMarkets } from "@/lib/schema";

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function Markets({ def }: { def: PanelDef }) {
  const data = await loadPanelData("markets", parseMarkets);
  if (!data) return <PanelShell def={def}><NoData /></PanelShell>;
  const invested = data.positions.reduce((s, p) => s + p.qty * p.price, 0);
  const pnl = data.strategies.reduce((s, x) => s + x.pnl, 0);
  return (
    <PanelShell def={def} kicker="Paper trading · fictional">
      <section className="rise grid grid-cols-2 gap-3" aria-label="Portfolio">
        <Tile label="Portfolio" value={money(invested + data.cash)} note={`${money(data.cash)} cash`} />
        <Tile label="Strategy P&L" value={money(pnl)} note="all paper trades" tone={pnl >= 0 ? "good" : "bad"} />
      </section>
      <Section title="Positions">
        {data.positions.map((p) => (
          <article key={p.symbol} className="glass flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{p.symbol}</p>
              <p className="truncate text-xs text-muted">
                {p.name} · {p.qty} shares
              </p>
            </div>
            <Sparkline values={p.history} label={`${p.symbol} price trend`} width={90} />
            <div className="text-right">
              <p className="font-semibold">{money(p.price)}</p>
              <p className={`text-xs ${p.changePct >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                {p.changePct >= 0 ? "+" : ""}
                {p.changePct.toFixed(1)}%
              </p>
            </div>
          </article>
        ))}
      </Section>
      <Section title="Strategies">
        <div className="grid grid-cols-2 gap-3">
          {data.strategies.map((s) => (
            <Tile key={s.name} label={s.name} value={`${Math.round(s.winRate * 100)}%`} note={`win rate · ${s.trades} trades`} />
          ))}
        </div>
      </Section>
      <p className="text-xs text-muted">{data.note}</p>
    </PanelShell>
  );
}
