/** Where panel data comes from. "mock" = the fictional JSON files in data/ (the default and the only source
 *  shipped). To add a real source, implement the DataSource interface in lib/data.ts and read
 *  docs/adapters.md first: a real source needs an authorization design before it is connected. */
export const DATA_SOURCE = "mock" as const;
