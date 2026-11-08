/** Shape checks for panel data. Whatever a data source returns passes through here before it reaches a page,
 *  so a future real adapter cannot push malformed or unexpected data into the UI. Unknown fields are dropped. */
export class DataError extends Error {}

type Obj = Record<string, unknown>;
const obj = (x: unknown, at: string): Obj => {
  if (typeof x !== "object" || x === null || Array.isArray(x)) throw new DataError(`${at}: expected an object`);
  return x as Obj;
};
const str = (x: unknown, at: string, max = 200): string => {
  if (typeof x !== "string" || x.length > max) throw new DataError(`${at}: expected text up to ${max} characters`);
  return x;
};
const num = (x: unknown, at: string): number => {
  if (typeof x !== "number" || !Number.isFinite(x)) throw new DataError(`${at}: expected a number`);
  return x;
};
const bool = (x: unknown, at: string): boolean => {
  if (typeof x !== "boolean") throw new DataError(`${at}: expected true or false`);
  return x;
};
const list = <T>(x: unknown, at: string, item: (v: unknown, at: string) => T, max = 50): T[] => {
  if (!Array.isArray(x) || x.length > max) throw new DataError(`${at}: expected a list of up to ${max} items`);
  return x.map((v, i) => item(v, `${at}[${i}]`));
};
/** Links shown in the UI: https only, so a data source can never inject javascript: or data: URLs. */
export const httpsUrl = (x: unknown, at: string): string => {
  const s = str(x, at, 2000);
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new DataError(`${at}: not a valid URL`);
  }
  if (u.protocol !== "https:" || u.username || u.password) throw new DataError(`${at}: only plain https links are allowed`);
  return u.toString();
};

export type Mission = {
  updated: string;
  tiles: { label: string; value: string; note: string }[];
  projects: { name: string; emoji: string; status: string; progress: number; next: string; waitingOnYou: boolean }[];
};
export function parseMission(x: unknown): Mission {
  const o = obj(x, "mission");
  return {
    updated: str(o.updated, "mission.updated", 40),
    tiles: list(o.tiles, "mission.tiles", (t, at) => {
      const v = obj(t, at);
      return { label: str(v.label, `${at}.label`, 40), value: str(v.value, `${at}.value`, 20), note: str(v.note, `${at}.note`, 60) };
    }, 8),
    projects: list(o.projects, "mission.projects", (p, at) => {
      const v = obj(p, at);
      const progress = num(v.progress, `${at}.progress`);
      if (progress < 0 || progress > 100) throw new DataError(`${at}.progress: 0 to 100`);
      return {
        name: str(v.name, `${at}.name`, 60),
        emoji: str(v.emoji, `${at}.emoji`, 8),
        status: str(v.status, `${at}.status`, 120),
        progress,
        next: str(v.next, `${at}.next`, 120),
        waitingOnYou: bool(v.waitingOnYou, `${at}.waitingOnYou`),
      };
    }, 20),
  };
}

export type Markets = {
  note: string;
  cash: number;
  positions: { symbol: string; name: string; qty: number; price: number; changePct: number; history: number[] }[];
  strategies: { name: string; trades: number; winRate: number; pnl: number }[];
};
export function parseMarkets(x: unknown): Markets {
  const o = obj(x, "markets");
  return {
    note: str(o.note, "markets.note", 200),
    cash: num(o.cash, "markets.cash"),
    positions: list(o.positions, "markets.positions", (p, at) => {
      const v = obj(p, at);
      return {
        symbol: str(v.symbol, `${at}.symbol`, 8),
        name: str(v.name, `${at}.name`, 60),
        qty: num(v.qty, `${at}.qty`),
        price: num(v.price, `${at}.price`),
        changePct: num(v.changePct, `${at}.changePct`),
        history: list(v.history, `${at}.history`, num, 120),
      };
    }, 20),
    strategies: list(o.strategies, "markets.strategies", (s, at) => {
      const v = obj(s, at);
      const winRate = num(v.winRate, `${at}.winRate`);
      if (winRate < 0 || winRate > 1) throw new DataError(`${at}.winRate: 0 to 1`);
      return { name: str(v.name, `${at}.name`, 60), trades: num(v.trades, `${at}.trades`), winRate, pnl: num(v.pnl, `${at}.pnl`) };
    }, 10),
  };
}

export type Training = {
  week: string;
  goalMinutes: number;
  sessions: { day: string; type: string; minutes: number; done: boolean }[];
  lifts: { name: string; unit: string; history: number[] }[];
};
export function parseTraining(x: unknown): Training {
  const o = obj(x, "training");
  return {
    week: str(o.week, "training.week", 40),
    goalMinutes: num(o.goalMinutes, "training.goalMinutes"),
    sessions: list(o.sessions, "training.sessions", (s, at) => {
      const v = obj(s, at);
      return {
        day: str(v.day, `${at}.day`, 10),
        type: str(v.type, `${at}.type`, 40),
        minutes: num(v.minutes, `${at}.minutes`),
        done: bool(v.done, `${at}.done`),
      };
    }, 14),
    lifts: list(o.lifts, "training.lifts", (l, at) => {
      const v = obj(l, at);
      return { name: str(v.name, `${at}.name`, 40), unit: str(v.unit, `${at}.unit`, 6), history: list(v.history, `${at}.history`, num, 52) };
    }, 10),
  };
}

export type Reading = { items: { title: string; source: string; minutes: number; tag: string; url: string }[] };
export function parseReading(x: unknown): Reading {
  const o = obj(x, "reading");
  return {
    items: list(o.items, "reading.items", (r, at) => {
      const v = obj(r, at);
      return {
        title: str(v.title, `${at}.title`, 200),
        source: str(v.source, `${at}.source`, 80),
        minutes: num(v.minutes, `${at}.minutes`),
        tag: str(v.tag, `${at}.tag`, 24),
        url: httpsUrl(v.url, `${at}.url`),
      };
    }, 50),
  };
}
