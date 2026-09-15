import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../app/api/elitigation/route";
const request = (citation: string) =>
  new NextRequest(
    `http://localhost/api/elitigation?citation=${encodeURIComponent(citation)}`,
  );
test("lookup rejects invalid input before making a request", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => {
    throw Error("Should not fetch");
  });
  assert.equal(
    (await GET(request("https://evil.org/2023_SGCA_5"))).status,
    400,
  );
  assert.equal((await GET(request("%ZZ"))).status, 400);
  assert.equal(mock.mock.callCount(), 0);
});
test("lookup uses fixed origin, refuses redirects and returns only matching metadata", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (url: unknown, options: RequestInit) => {
      assert.equal(url, "https://www.elitigation.sg/gd/s/2023_SGCA_5");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal);
      return new Response(
        '<title>[2023] SGCA 5</title><div class="HN-CaseName"><span>A</span><div><br></div><span>v</span><div><br></div><span>B</span></div>',
        { headers: { "content-type": "text/html" } },
      );
    },
  );
  const response = await GET(request("[2023] SGCA 5"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).caseName, "A v B");
});
test("upstream failures and excessive response sizes retain the parsed citation", async (t) => {
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("Too large", {
        headers: { "content-type": "text/html", "content-length": "6000000" },
      }),
  );
  let response = await GET(request("2023_SGCA_5"));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).caseNo, "5");
  mock.mock.mockImplementation(async () => {
    throw new Error("Network unavailable");
  });
  response = await GET(request("2023_SGCA_5"));
  assert.equal(response.status, 502);
});
