import { NextResponse, type NextRequest } from "next/server";
import { createHandler } from "@/lib/assistant/handler";

/** The assistant runs here, on the server. The browser sends the conversation and gets a reply; it never sees
 *  the provider address, the key or the configured access code. The logic lives in lib/assistant/handler.ts. */
export const dynamic = "force-dynamic";
const handler = createHandler(process.env);

const json = ({ status, body }: { status: number; body: unknown }) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  return json(await handler.info());
}

export async function POST(request: NextRequest) {
  return json(
    await handler.chat({
      origin: request.headers.get("origin"),
      selfOrigin: request.nextUrl.origin,
      forwardedFor: request.headers.get("x-forwarded-for"),
      accessCode: request.headers.get("x-access-code"),
      contentLength: request.headers.get("content-length"),
      body: request.body,
    }),
  );
}
