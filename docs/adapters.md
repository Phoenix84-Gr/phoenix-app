# Connecting a real data source

The demo ships one data source, `mock`, which serves the fictional JSON in `data/`. A real source (a database, an
API, files on your computer) plugs in behind the same interface in `lib/data.ts`:

```ts
export interface DataSource {
  name: string;
  load(panelId: string): Promise<unknown>;
}
```

Whatever `load` returns still passes the panel's parser in `lib/schema.ts` (strict types, length caps, https-only
links), so a misbehaving source cannot inject markup or links into the pages.

## Before you connect anything: answer these in writing

The demo has **no login**. Real data changes that. Fill this in with the person whose data it is, then build it:

| Question | Why it matters |
|---|---|
| Who may open the app? How do they sign in, and how is a session checked on **every** page and API route? | Without it, anyone with the address sees the data |
| Which panels read which data, and with whose permissions? Can the server read more than the user may see? | Least privilege; a bug should not expose everything |
| Where do credentials live? (server environment only; never the public prefix; never in data files) | Secrets must not reach the browser bundle or the repository |
| Is any data cached? Where (server, CDN, the phone)? For how long? | Private pages must be `no-store` and never cached by a CDN or the browser |
| What does an error show the user, and what goes to the logs? | Errors and logs must not carry personal data or tokens |
| What happens when the source is down or returns bad data? | The page should say "no data", not crash or show stale data as fresh |
| How is it tested without real data? | Tests and screenshots use fictional data only |

## Patterns the full Phoenix uses (for reference)

- One pinned owner identity checked on the server for every page and action (fail closed until it is set).
- A per-request CSP nonce, `Cache-Control: private, no-store` on private pages, and no secrets with the public prefix.
- Model costs recorded in a ledger with daily and monthly caps checked before each call.
- Laptop jobs as signed envelopes: the server signs, the laptop verifies with a pinned public key and runs only the
  exact text that was approved.

These are described here as patterns; the demo does not include them.
