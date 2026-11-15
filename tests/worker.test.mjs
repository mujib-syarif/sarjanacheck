import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker from "../worker.js";

const TAG = "%232PP"; // #2PP
const env = { CLASHKING_TOKEN: "tok" };
const origFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = origFetch; });

function req(path) {
  return new Request("https://api.test" + path, { headers: { Origin: "https://mujib-syarif.github.io" } });
}

test("upstream error text never reaches the client", async () => {
  globalThis.fetch = async () => new Response("echo: Bearer tok SECRET-DETAIL", { status: 500 });
  const res = await worker.fetch(req("/memberhistory?tag=" + TAG), env);
  const text = await res.text();
  assert.ok(!text.includes("SECRET-DETAIL"), text);
  assert.ok(!text.includes("Bearer"), text);
});

test("unexpected exceptions return a generic error", async () => {
  const res = await worker.fetch(req("/memberhistory?tag=" + TAG), { get CLASHKING_TOKEN() { throw new Error("boom-internal"); } });
  const text = await res.text();
  assert.ok([500, 502].includes(res.status), String(res.status));
  assert.ok(!text.includes("boom-internal"), text);
});

test("older pages are still fetched when the newer direction uses its own budget", async () => {
  const calls = [];
  let n = 0;
  globalThis.fetch = async (url) => {
    const u = new URL(String(url));
    calls.push(u.search);
    // every legacy page is full (1000 events) and always brings new, unique events
    const base = n * 1000;
    n += 1;
    const items = Array.from({ length: 1000 }, (_, i) => ({
      type: "join", tag: "#P" + (base + i), name: "p", time: new Date(Date.UTC(2026, 0, 1) + (u.searchParams.has("timestamp_end") ? -1 : 1) * (base + i) * 1000).toISOString(),
    }));
    return new Response(JSON.stringify({ items }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const res = await worker.fetch(req("/memberhistory?tag=" + TAG), { });
  assert.equal(res.status, 200);
  const newer = calls.filter((s) => s.includes("timestamp_start")).length;
  const older = calls.filter((s) => s.includes("timestamp_end")).length;
  assert.ok(newer >= 1 && older >= 1, `newer=${newer} older=${older}`);
  assert.ok(calls.length <= 12);
});

test("season.json points at files that exist", () => {
  const season = JSON.parse(fs.readFileSync(new URL("../season.json", import.meta.url), "utf8"));
  for (const file of [...Object.values(season.heroes), season.background]) {
    assert.ok(fs.existsSync(new URL("../" + file, import.meta.url)), file);
  }
});
