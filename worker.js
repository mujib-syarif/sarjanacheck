const COC_API = "https://cocproxy.royaleapi.dev/v1";

const ALLOWED_ORIGIN = "https://mujib-syarif.github.io";


// ============================================================
// CORS
// ============================================================

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}


// ============================================================
// JSON RESPONSE
// ============================================================

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}


// ============================================================
// ERROR RESPONSE
// ============================================================

function errorResponse(message, status = 500, origin = "") {
  return json(
    {
      ok: false,
      error: message,
    },
    status,
    origin
  );
}


// ============================================================
// TAG HELPERS
// ============================================================

function cleanTag(value) {
  if (!value) {
    return "";
  }

  let tag = String(value).trim();

  try {
    tag = decodeURIComponent(tag);
  } catch (_) {}

  tag = tag.toUpperCase();

  if (!tag.startsWith("#")) {
    tag = `#${tag}`;
  }

  return tag;
}


function encodedTag(value) {
  return encodeURIComponent(cleanTag(value));
}


function isRealWarTag(value) {
  if (!value) {
    return false;
  }

  const tag = cleanTag(value);

  if (!tag) {
    return false;
  }

  if (tag === "#0") {
    return false;
  }

  if (tag.length <= 2) {
    return false;
  }

  return true;
}


// ============================================================
// NUMBER
// ============================================================

function number(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}


// ============================================================
// API REQUEST
// ============================================================

async function getCoC(path, env) {
  if (!env.COC_API_TOKEN) {
    throw new Error("COC_API_TOKEN belum diset di Cloudflare Worker.");
  }

  const response = await fetch(`${COC_API}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.COC_API_TOKEN}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();

  let body = null;

  try {
    body = JSON.parse(text);
  } catch (_) {
    body = null;
  }

  if (!response.ok) {
    const reason =
      body?.reason ||
      body?.message ||
      `HTTP ${response.status}`;

    const error = new Error(reason);

    error.status = response.status;
    error.body = body;

    throw error;
  }

  return body;
}


// ============================================================
// ROLE
// ============================================================

function getRoleName(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "leader") {
    return "Leader";
  }

  if (value === "coleader" || value === "co-leader") {
    return "Co-Leader";
  }

  if (value === "admin" || value === "elder") {
    return "Elder";
  }

  return "Member";
}


// ============================================================
// IMAGE BADGE
// ============================================================

function normalizeBadge(clan) {
  if (!clan) {
    return null;
  }

  const urls = clan.iconUrls || clan.badgeUrls || {};

  return {
    small: urls.small || null,
    medium: urls.medium || null,
    large: urls.large || null,
  };
}


// ============================================================
// TOWN HALL BREAKDOWN
// ============================================================

function townHallBreakdown(memberList = []) {
  const result = {};

  for (let th = 1; th <= 18; th++) {
    result[String(th)] = 0;
  }

  for (const member of memberList) {
    const th = number(member?.townHallLevel);

    if (th >= 1 && th <= 18) {
      result[String(th)]++;
    }
  }

  return result;
}


// ============================================================
// NORMALIZE CLAN
// ============================================================

function normalizeClan(clan) {
  if (!clan) {
    return null;
  }

  const memberList = Array.isArray(clan.memberList)
    ? clan.memberList
    : [];

  return {
    tag: clan.tag || null,
    name: clan.name || "-",

    clanLevel: number(clan.clanLevel),

    members: number(
      clan.members,
      memberList.length
    ),

    memberList,

    description: clan.description || "",

    clanPoints: number(clan.clanPoints),
    clanVersusPoints: number(clan.clanVersusPoints),

    warWins: number(clan.warWins),
    warLosses: number(clan.warLosses),
    warDraws: number(clan.warDraws),

    warWinStreak: number(clan.warWinStreak),

    badgeUrls: normalizeBadge(clan),

    type: clan.type || null,
    requiredTrophies: number(clan.requiredTrophies),
    warFrequency: clan.warFrequency || null,

    location: clan.location || null,

    labels: Array.isArray(clan.labels)
      ? clan.labels
      : [],

    chatLanguage: clan.chatLanguage || null,

    townHallBreakdown: townHallBreakdown(memberList),
  };
}


// ============================================================
// NORMALIZE PLAYER
// ============================================================

function normalizePlayer(player) {
  if (!player) {
    return null;
  }

  const heroes = Array.isArray(player.heroes)
    ? player.heroes.map((hero) => ({
        ...hero,

        level: number(hero.level),
        maxLevel: number(
          hero.maxLevel ??
          hero.maxLevelForTownHall
        ),
      }))
    : [];

  const heroEquipment = Array.isArray(player.heroEquipment)
    ? player.heroEquipment.map((item) => ({
        ...item,

        level: number(item.level),
        maxLevel: number(
          item.maxLevel ??
          item.maxLevelForTownHall
        ),
      }))
    : [];

  return {
    ...player,

    tag: player.tag || null,
    name: player.name || "-",

    townHallLevel: number(player.townHallLevel),
    expLevel: number(player.expLevel),

    trophies: number(player.trophies),
    bestTrophies: number(player.bestTrophies),

    versusTrophies: number(player.versusTrophies),
    bestVersusTrophies: number(player.bestVersusTrophies),

    warStars: number(player.warStars),
    attackWins: number(player.attackWins),
    defenseWins: number(player.defenseWins),

    donations: number(player.donations),
    donationsReceived: number(player.donationsReceived),

    role: player.role || "member",
    roleName: getRoleName(player.role),

    clan: player.clan
      ? normalizeClan(player.clan)
      : null,

    heroes,
    heroEquipment,
  };
}


// ============================================================
// CWL CLAN
// ============================================================

function normalizeCWLClan(leagueClan, clanData = null) {
  const memberList = Array.isArray(clanData?.memberList)
    ? clanData.memberList
    : [];

  return {
    tag:
      clanData?.tag ||
      leagueClan?.tag ||
      null,

    name:
      clanData?.name ||
      leagueClan?.name ||
      "-",

    clanLevel: number(
      clanData?.clanLevel ??
      leagueClan?.clanLevel
    ),

    members: number(
      clanData?.members ??
      leagueClan?.members ??
      memberList.length
    ),

    memberList,

    badgeUrls:
      normalizeBadge(clanData) ||
      normalizeBadge(leagueClan),

    townHallBreakdown:
      townHallBreakdown(memberList),

    warLeague:
      leagueClan?.warLeague ||
      clanData?.warLeague ||
      null,
  };
}


// ============================================================
// NORMALIZE WAR SIDE
// ============================================================

function normalizeWarSide(side) {
  if (!side) {
    return null;
  }

  return {
    tag: side.tag || null,
    name: side.name || "-",

    clanLevel: number(side.clanLevel),

    attacks: number(side.attacks),
    stars: number(side.stars),

    destructionPercentage: number(
      side.destructionPercentage
    ),

    members: Array.isArray(side.members)
      ? side.members
      : [],
  };
}


// ============================================================
// NORMALIZE CWL WAR
// ============================================================

function normalizeWar(war, targetTag) {
  if (!war) {
    return null;
  }

  const wantedTag = cleanTag(targetTag);

  const clan = normalizeWarSide(war.clan);
  const opponent = normalizeWarSide(war.opponent);

  if (!clan || !opponent) {
    return null;
  }

  let target = null;
  let enemy = null;

  if (cleanTag(clan.tag) === wantedTag) {
    target = clan;
    enemy = opponent;
  } else if (cleanTag(opponent.tag) === wantedTag) {
    target = opponent;
    enemy = clan;
  }

  if (!target) {
    return null;
  }

  let result = "draw";

  if (target.stars > enemy.stars) {
    result = "win";
  } else if (target.stars < enemy.stars) {
    result = "loss";
  }

  return {
    state: war.state || "unknown",

    teamSize: number(war.teamSize),

    attacksPerMember: number(
      war.attacksPerMember,
      1
    ),

    battleModifier:
      war.battleModifier || null,

    preparationStartTime:
      war.preparationStartTime || null,

    startTime:
      war.startTime || null,

    endTime:
      war.endTime || null,

    clan,
    opponent,

    target,
    enemy,

    result,
  };
}


// ============================================================
// GET PLAYER
// ============================================================

async function getPlayer(tag, env) {
  const data = await getCoC(
    `/players/${encodedTag(tag)}`,
    env
  );

  return normalizePlayer(data);
}


// ============================================================
// GET CLAN
// ============================================================

async function getClan(tag, env) {
  const data = await getCoC(
    `/clans/${encodedTag(tag)}`,
    env
  );

  return normalizeClan(data);
}


// ============================================================
// GET CURRENT CWL LEAGUE GROUP
// ============================================================

async function getLeagueGroup(tag, env) {
  return getCoC(
    `/clans/${encodedTag(tag)}/currentwar/leaguegroup`,
    env
  );
}


// ============================================================
// GET CWL WAR BY WAR TAG
// ============================================================

async function getLeagueWar(warTag, env) {
  return getCoC(
    `/clanwarleagues/wars/${encodedTag(warTag)}`,
    env
  );
}


// ============================================================
// GET CWL
// ============================================================

async function getCWL(tag, env) {
  const targetTag = cleanTag(tag);

  const leagueGroup = await getLeagueGroup(
    targetTag,
    env
  );

  const leagueClans =
    Array.isArray(leagueGroup?.clans)
      ? leagueGroup.clans
      : [];

  // ----------------------------------------------------------
  // FETCH 8 CLANS
  // ----------------------------------------------------------

  const clanResults = await Promise.all(
    leagueClans.map(async (leagueClan) => {
      try {
        const clan = await getClan(
          leagueClan.tag,
          env
        );

        return normalizeCWLClan(
          leagueClan,
          clan
        );
      } catch (_) {
        return normalizeCWLClan(
          leagueClan,
          null
        );
      }
    })
  );

  // ----------------------------------------------------------
  // ROUNDS
  // ----------------------------------------------------------

  const rawRounds =
    Array.isArray(leagueGroup?.rounds)
      ? leagueGroup.rounds
      : [];

  const rounds = [];

  for (let index = 0; index < 7; index++) {
    const rawRound = rawRounds[index] || {};

    const warTags =
      Array.isArray(rawRound.warTags)
        ? rawRound.warTags.filter(isRealWarTag)
        : [];

    rounds.push({
      roundNumber: index + 1,
      warTags,
      wars: [],
      targetWar: null,
    });
  }

  // ----------------------------------------------------------
  // UNIQUE WAR TAGS
  // ----------------------------------------------------------

  const uniqueWarTags = [
    ...new Set(
      rounds
        .flatMap((round) => round.warTags)
        .filter(isRealWarTag)
    ),
  ];

  // ----------------------------------------------------------
  // FETCH ALL CWL WARS
  // ----------------------------------------------------------

  const warResults = await Promise.all(
    uniqueWarTags.map(async (warTag) => {
      try {
        const war = await getLeagueWar(
          warTag,
          env
        );

        return {
          warTag,
          war,
        };
      } catch (error) {
        return {
          warTag,
          war: null,
          error: error.message,
        };
      }
    })
  );

  const warMap = new Map();

  for (const item of warResults) {
    if (item.war) {
      warMap.set(
        cleanTag(item.warTag),
        item.war
      );
    }
  }

  // ----------------------------------------------------------
  // ASSIGN WAR TO ROUND
  // ----------------------------------------------------------

  for (const round of rounds) {
    const normalizedWars = [];

    for (const warTag of round.warTags) {
      const rawWar = warMap.get(
        cleanTag(warTag)
      );

      if (!rawWar) {
        continue;
      }

      const normalized = normalizeWar(
        rawWar,
        targetTag
      );

      if (normalized) {
        normalized.warTag = warTag;

        normalizedWars.push(
          normalized
        );
      }
    }

    round.wars = normalizedWars;

    // IMPORTANT:
    // cari WAR milik clan yang sedang dicek.
    // BUKAN wars[0].
    round.targetWar =
      normalizedWars.find(
        (war) =>
          cleanTag(
            war.target?.tag
          ) === targetTag
      ) || null;
  }

  // ----------------------------------------------------------
  // CURRENT CLAN
  // ----------------------------------------------------------

  let currentClan = null;

  try {
    currentClan = await getClan(
      targetTag,
      env
    );
  } catch (_) {
    currentClan =
      clanResults.find(
        (clan) =>
          cleanTag(clan.tag) === targetTag
      ) || null;
  }

  // ----------------------------------------------------------
  // STATS
  // ----------------------------------------------------------

  const availableRounds =
    rounds.filter(
      (round) => !!round.targetWar
    ).length;

  const completedRounds =
    rounds.filter(
      (round) =>
        round.targetWar?.state ===
        "warEnded"
    ).length;

  const activeRounds =
    rounds.filter(
      (round) =>
        round.targetWar?.state ===
        "inWar"
    ).length;

  const preparationRounds =
    rounds.filter(
      (round) =>
        round.targetWar?.state ===
        "preparation"
    ).length;

  return {
    tag: targetTag,

    state:
      leagueGroup?.state ||
      null,

    season:
      leagueGroup?.season ||
      null,

    warLeague:
      currentClan?.warLeague ||
      null,

    totalRounds: 7,

    availableRounds,
    completedRounds,
    activeRounds,
    preparationRounds,

    clans: clanResults,

    currentClan,

    rounds,
  };
}


// ============================================================
// ROUTER
// ============================================================

async function router(request, env) {
  const url = new URL(request.url);

  const pathname =
    url.pathname.replace(/\/+$/, "") ||
    "/";

  // ----------------------------------------------------------
  // HEALTH
  // ----------------------------------------------------------

  if (
    request.method === "GET" &&
    pathname === "/"
  ) {
    return {
      ok: true,
      service: "Sarjana Checker API",
      status: "online",
    };
  }

  // ----------------------------------------------------------
  // PLAYER
  // ----------------------------------------------------------

  if (
    request.method === "GET" &&
    pathname === "/player"
  ) {
    const tag =
      url.searchParams.get("tag");

    if (!tag) {
      throw Object.assign(
        new Error("Parameter ?tag= wajib diisi."),
        { status: 400 }
      );
    }

    return {
      ok: true,
      player: await getPlayer(
        tag,
        env
      ),
    };
  }

  // ----------------------------------------------------------
  // CLAN
  // ----------------------------------------------------------

  if (
    request.method === "GET" &&
    pathname === "/clan"
  ) {
    const tag =
      url.searchParams.get("tag");

    if (!tag) {
      throw Object.assign(
        new Error("Parameter ?tag= wajib diisi."),
        { status: 400 }
      );
    }

    return {
      ok: true,
      clan: await getClan(
        tag,
        env
      ),
    };
  }

  // ----------------------------------------------------------
  // CWL
  // ----------------------------------------------------------

  if (
    request.method === "GET" &&
    pathname === "/cwl"
  ) {
    const tag =
      url.searchParams.get("tag");

    if (!tag) {
      throw Object.assign(
        new Error("Parameter ?tag= wajib diisi."),
        { status: 400 }
      );
    }

    return {
      ok: true,
      cwl: await getCWL(
        tag,
        env
      ),
    };
  }

  throw Object.assign(
    new Error("Endpoint tidak ditemukan."),
    { status: 404 }
  );
}


// ============================================================
// WORKER
// ============================================================

export default {
  async fetch(request, env) {
    const origin =
      request.headers.get("Origin") || "";

    // --------------------------------------------------------
    // PREFLIGHT
    // --------------------------------------------------------

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    try {
      const result =
        await router(
          request,
          env
        );

      return json(
        result,
        200,
        origin
      );
    } catch (error) {
      console.error(error);

      const status =
        Number(error?.status) || 500;

      return errorResponse(
        error?.message ||
          "Terjadi kesalahan pada server.",
        status,
        origin
      );
    }
  },
};
