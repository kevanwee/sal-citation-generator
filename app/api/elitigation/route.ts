import { NextRequest, NextResponse } from "next/server";
import { parseElitigationUrl } from "@/lib/citationEngine";
import { extractCaseName } from "@/lib/elitigation";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("citation") || "";
  const parsed = input.length <= 200 ? parseElitigationUrl(input) : null;
  if (!parsed)
    return NextResponse.json(
      { error: "Enter a Singapore neutral citation or eLitigation URL." },
      { status: 400 },
    );
  const neutral = `[${parsed.year}] ${parsed.court} ${parsed.caseNo}`;
  // Fixed origin and canonical path. Never fetch an arbitrary supplied URL or follow redirects.
  const sourceUrl = `https://www.elitigation.sg/gd/s/${parsed.year}_${parsed.court}_${parsed.caseNo}`;
  try {
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(10000),
      redirect: "error",
      next: { revalidate: 86400 },
      headers: { Accept: "text/html" },
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("text/html")
    )
      throw Error("Unavailable");
    if (Number(response.headers.get("content-length")) > 5_000_000)
      throw Error("Too large");
    const reader = response.body?.getReader();
    if (!reader) throw Error("Empty response");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 5_000_000) throw Error("Too large");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const caseName = extractCaseName(
      Buffer.concat(chunks).toString("utf8"),
      neutral,
    );
    if (!caseName) throw Error("No matching case header");
    return NextResponse.json({ ...parsed, caseName, sourceUrl });
  } catch {
    return NextResponse.json(
      {
        ...parsed,
        sourceUrl,
        error:
          "The judgment could not be retrieved. Your neutral citation is ready; enter the case name manually.",
      },
      { status: 502 },
    );
  }
}
