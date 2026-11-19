import assert from "node:assert/strict";
import test from "node:test";

import worker from "../worker.js";

test("clan statistics preserve missing war counters as null", async () => {
  const originalFetch = globalThis.fetch;
  const upstreamClan = {
    tag: "#2J0P2GR08",
    name: "Regression Test Clan",
    clanLevel: 10,
    members: 1,
    memberList: [
      {
        tag: "#2J0P2GR08",
        name: "Test Member",
        townHallLevel: 19,
        donations: 120,
        warStars: 45
      }
    ],
    clanPoints: 12345,
    clanCapitalPoints: 6789
    // Deliberately omit warWins, warLosses, warTies and warWinStreak.
  };

  globalThis.fetch = async () =>
    new Response(JSON.stringify(upstreamClan), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  try {
    const request = new Request(
      "https://worker.test/clan?tag=%232J0P2GR08",
      { headers: { "CF-Connecting-IP": "198.51.100.41" } }
    );
    const response = await worker.fetch(request, {
      COC_API_TOKEN: "test-token"
    });

    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.ok, true);
    assert.equal(body.clan.warWins, null);
    assert.equal(body.clan.warLosses, null);
    assert.equal(body.clan.warTies, null);
    assert.equal(body.clan.warWinStreak, null);

    // Other numeric clan and roster data must remain intact.
    assert.equal(body.clan.clanPoints, 12345);
    assert.equal(body.clan.clanCapitalPoints, 6789);
    assert.equal(body.clan.memberList[0].townHallLevel, 19);
    assert.equal(body.clan.memberList[0].donations, 120);
    assert.equal(body.clan.memberList[0].warStars, 45);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("clan statistics preserve real zero counters", async () => {
  const originalFetch = globalThis.fetch;
  const upstreamClan = {
    tag: "#2J0P2GR08",
    name: "Zero Counter Clan",
    members: 0,
    warWins: 0,
    warLosses: 0,
    warTies: 0,
    warWinStreak: 0,
    memberList: []
  };

  globalThis.fetch = async () =>
    new Response(JSON.stringify(upstreamClan), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  try {
    const request = new Request(
      "https://worker.test/clan?tag=%232J0P2GR08",
      { headers: { "CF-Connecting-IP": "198.51.100.42" } }
    );
    const response = await worker.fetch(request, {
      COC_API_TOKEN: "test-token"
    });

    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.clan.warWins, 0);
    assert.equal(body.clan.warLosses, 0);
    assert.equal(body.clan.warTies, 0);
    assert.equal(body.clan.warWinStreak, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
