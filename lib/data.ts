import { DATA_SOURCE } from "@/config/data";
import { MOCK_DATA } from "@/data";

/** A data source returns raw data for a panel id; the panel's parser (lib/schema.ts) checks it before use.
 *  Runs on the server only: page components call it, the browser never sees the source or its credentials. */
export interface DataSource {
  name: string;
  load(panelId: string): Promise<unknown>;
}

export const mockSource: DataSource = {
  name: "mock",
  async load(panelId) {
    return Object.hasOwn(MOCK_DATA, panelId) ? structuredClone(MOCK_DATA[panelId]) : null;
  },
};

const SOURCES: Record<string, DataSource> = { mock: mockSource };

/** Load and check one panel's data. Returns null (the page shows "no data") instead of throwing on bad data. */
export async function loadPanelData<T>(panelId: string, parse: (raw: unknown) => T): Promise<T | null> {
  const raw = await SOURCES[DATA_SOURCE].load(panelId);
  if (raw === null) return null;
  try {
    return parse(raw);
  } catch (error) {
    console.error(`panel data for "${panelId}" was rejected:`, (error as Error).message);
    return null;
  }
}
