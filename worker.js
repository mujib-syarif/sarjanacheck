const COC_API = "https://cocproxy.royaleapi.dev/v1";

const ALLOWED_ORIGIN =
  "https://mujib-syarif.github.io";

/* =========================================================
   CORS
========================================================= */

function corsHeaders(request) {
  const origin =
    request.headers.get("Origin") || "";

  return {
    "Access-Control-Allow-Origin":
      origin === ALLOWED_ORIGIN
        ? origin
        : ALLOWED_ORIGIN,

    "Access-Control-Allow-Methods":
      "GET, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type",

    "Access-Control-Max-Age":
      "86400"
  };
}


/* =========================================================
   RESPONSE
========================================================= */

function json(data, request, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders(request),
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}


function errorResponse(
  request,
  message,
  status = 400
) {
  return json(
    {
      ok: false,
      error: message
    },
    request,
    status
  );
}


/* =========================================================
   HELPERS
========================================================= */

function firstValue(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}


function number(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}


function cleanTag(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^%23/, "#")
    .replace(/^#?/, "#");
}


function encodedTag(tag) {
  return encodeURIComponent(
    cleanTag(tag)
  );
}


function isRealWarTag(tag) {
  if (!tag) return false;

  return (
    tag !== "#0" &&
    tag !== "0" &&
    !tag.startsWith("#0")
  );
}


function normalizeBadge(source) {
  if (!source) {
    return {};
  }

  if (source.badgeUrls) {
    return source.badgeUrls;
  }

  if (
    source.badge &&
    typeof source.badge === "object"
  ) {
    return (
      source.badge.iconUrls ||
      source.badge
    );
  }

  return {};
}


/* =========================================================
   TOWN HALL
========================================================= */

function townHallBreakdown(
  members = []
) {
  const result = {};

  for (let i = 1; i <= 18; i++) {
    result[String(i)] = 0;
  }

  for (const member of members) {
    const th = number(
      firstValue(
        member.townHallLevel,
        member.townhallLevel,
        member.townHall
      )
    );

    if (th >= 1 && th <= 18) {
      result[String(th)]++;
    }
  }

  return result;
}


/* =========================================================
   PLAYER NORMALIZER
========================================================= */

function normalizePlayer(player) {
  if (!player) {
    return null;
  }

  const heroes = Array.isArray(
    player.heroes
  )
    ? player.heroes.map(hero => ({
        name: hero.name,
        level: number(hero.level),
        maxLevel: number(
          firstValue(
            hero.maxLevel,
            hero.maxLevelForTownHall
          )
        ),
        village:
          firstValue(
            hero.village,
            hero.villageType
          ),
        equipment:
          Array.isArray(hero.equipment)
            ? hero.equipment
            : []
      }))
    : [];

  const heroEquipment =
    Array.isArray(player.heroEquipment)
      ? player.heroEquipment.map(item => ({
          name: item.name,
          level: number(item.level),
          maxLevel: number(
            firstValue(
              item.maxLevel,
              item.maxLevelForTownHall
            )
          ),
          hero:
            firstValue(
              item.hero,
              item.heroName
            ),
          village:
            firstValue(
              item.village,
              item.villageType
            )
        }))
      : [];

  return {
    tag: player.tag,
    name: player.name,

    townHallLevel:
      number(player.townHallLevel),

    expLevel:
      number(player.expLevel),

    trophies:
      number(player.trophies),

    bestTrophies:
      number(player.bestTrophies),

    warStars:
      number(player.warStars),

    attackWins:
      number(player.attackWins),

    defenseWins:
      number(player.defenseWins),

    donations:
      number(player.donations),

    donationsReceived:
      number(player.donationsReceived),

    clanRank:
      number(player.clanRank),

    previousClanRank:
      number(player.previousClanRank),

    role:
      player.role || null,

    roleName:
      normalizeRole(player.role),

    clan:
      player.clan
        ? {
            tag: player.clan.tag,
            name: player.clan.name,
            clanLevel:
              number(
                player.clan.clanLevel
              ),
            badgeUrls:
              normalizeBadge(
                player.clan
              )
          }
        : null,

    builderBaseTrophies:
      number(
        firstValue(
          player.builderBaseTrophies,
          player.versusTrophies
        )
      ),

    league:
      player.league || null,

    leagueTier:
      firstValue(
        player.leagueTier,
        player.rankedLeague,
        null
      ),

    builderBaseLeague:
      player.builderBaseLeague || null,

    heroes,

    heroEquipment
  };
}


/* =========================================================
   ROLE
========================================================= */

function normalizeRole(role) {
  const value =
    String(role || "")
      .toLowerCase();

  if (value === "leader") {
    return "Leader";
  }

  if (
    value === "coleader" ||
    value === "co-leader"
  ) {
    return "Co-Leader";
  }

  if (
    value === "admin" ||
    value === "elder"
  ) {
    return "Elder";
  }

  return "Member";
}


/* =========================================================
   CWL CLAN NORMALIZER
========================================================= */

function normalizeCWLClan(
  clan,
  cwlRoster = null
) {
  if (!clan) {
    return null;
  }

  /*
   * Detail clan dari /clans/{tag} memakai memberList (array)
   * dan members (angka). Data sisi war memakai members (array).
   * Dua-duanya harus didukung.
   */

  const members =
    Array.isArray(clan.memberList)
      ? clan.memberList
      : Array.isArray(clan.members)
        ? clan.members
        : [];

  const roster =
    Array.isArray(cwlRoster)
      ? cwlRoster
      : [];

  const effectiveRoster =
    roster.length
      ? roster
      : members;

  return {
    tag: clan.tag,
    name: clan.name,

    clanLevel:
      number(clan.clanLevel),

    members:
      number(
        firstValue(
          clan.membersCount,
          typeof clan.members ===
            "number"
            ? clan.members
            : null,
          members.length
        )
      ),

    memberList:
      effectiveRoster,

    badgeUrls:
      normalizeBadge(clan),

    description:
      clan.description || "",

    clanPoints:
      number(clan.clanPoints),

    clanCapitalPoints:
      number(clan.clanCapitalPoints),

    warWins:
      number(clan.warWins),

    warWinStreak:
      number(clan.warWinStreak),

    warLosses:
      number(clan.warLosses),

    warLeague:
      clan.warLeague || null,

    type:
      clan.type || null,

    location:
      clan.location || null,

    chatLanguage:
      clan.chatLanguage || null,

    cwlRoster:
      effectiveRoster,

    cwlRosterSize:
      effectiveRoster.length,

    townHallBreakdown:
      townHallBreakdown(
        effectiveRoster
      ),

    cwlTownHallBreakdown:
      townHallBreakdown(
        effectiveRoster
      )
  };
}


/* =========================================================
   MEMBER NORMALIZER
========================================================= */

function normalizeMember(member) {
  if (!member) {
    return null;
  }

  return {
    tag: member.tag,
    name: member.name,

    townHallLevel:
      number(member.townHallLevel),

    expLevel:
      number(member.expLevel),

    trophies:
      number(member.trophies),

    builderBaseTrophies:
      number(
        firstValue(
          member.builderBaseTrophies,
          member.versusTrophies
        )
      ),

    clanRank:
      number(member.clanRank),

    previousClanRank:
      number(member.previousClanRank),

    role:
      member.role || null,

    roleName:
      normalizeRole(member.role),

    donations:
      number(member.donations),

    donationsReceived:
      number(
        member.donationsReceived
      ),

    warStars:
      number(member.warStars),

    attackWins:
      number(member.attackWins),

    defenseWins:
      number(member.defenseWins)
  };
}


/* =========================================================
   CLAN NORMALIZER
========================================================= */

function normalizeClan(
  clan,
  cwlRoster = null
) {
  const memberList =
    Array.isArray(clan.memberList)
      ? clan.memberList
      : [];

  const roster =
    Array.isArray(cwlRoster)
      ? cwlRoster
      : [];

  const effectiveRoster =
    roster.length
      ? roster
      : memberList;

  return {
    tag: clan.tag,
    name: clan.name,

    clanLevel:
      number(clan.clanLevel),

    members:
      number(clan.members),

    memberList,

    badgeUrls:
      normalizeBadge(clan),

    description:
      clan.description || "",

    clanPoints:
      number(clan.clanPoints),

    clanCapitalPoints:
      number(clan.clanCapitalPoints),

    warWins:
      number(clan.warWins),

    warWinStreak:
      number(clan.warWinStreak),

    warLosses:
      number(clan.warLosses),

    warLeague:
      clan.warLeague || null,

    type:
      clan.type || null,

    location:
      clan.location || null,

    chatLanguage:
      clan.chatLanguage || null,

    cwlRoster:
      effectiveRoster,

    cwlRosterSize:
      effectiveRoster.length,

    townHallBreakdown:
      townHallBreakdown(
        effectiveRoster
      ),

    cwlTownHallBreakdown:
      townHallBreakdown(
        effectiveRoster
      )
  };
}


/* =========================================================
   WAR SIDE
========================================================= */

function normalizeWarSide(
  side
) {
  if (!side) {
    return null;
  }

  return {
    tag:
      side.tag,

    name:
      side.name,

    clanLevel:
      number(side.clanLevel),

    stars:
      number(
        firstValue(
          side.stars,
          side.clanStars
        )
      ),

    destructionPercentage:
      number(
        firstValue(
          side.destructionPercentage,
          side.destruction
        )
      ),

    members:
      Array.isArray(side.members)
        ? side.members
        : [],

    attacks:
      Array.isArray(side.attacks)
        ? side.attacks
        : [],

    badgeUrls:
      normalizeBadge(side)
  };
}


/* =========================================================
   WAR
========================================================= */

function normalizeWar(
  war,
  wantedTag = null
) {
  if (!war) {
    return null;
  }

  const wanted =
    wantedTag
      ? cleanTag(wantedTag)
      : null;

  const clan =
    war.clan || null;

  const opponent =
    war.opponent || null;

  let target = null;
  let enemy = null;

  if (clan && opponent) {
    const clanTag =
      cleanTag(clan.tag);

    const opponentTag =
      cleanTag(opponent.tag);

    /*
     * Kalau clan yang dicari berada
     * di sisi opponent, balik target/enemy.
     */

    if (
      wanted &&
      opponentTag === wanted
    ) {
      target =
        normalizeWarSide(
          opponent
        );

      enemy =
        normalizeWarSide(
          clan
        );
    }

    /*
     * Normal:
     * clan = target
     * opponent = enemy
     */

    else if (
      !wanted ||
      clanTag === wanted
    ) {
      target =
        normalizeWarSide(
          clan
        );

      enemy =
        normalizeWarSide(
          opponent
        );
    }

    /*
     * War tidak melibatkan
     * clan yang diminta.
     */

    else {
      return null;
    }
  }

  return {
    state:
      war.state || "unknown",

    teamSize:
      number(war.teamSize),

    preparationStartTime:
      war.preparationStartTime ||
      null,

    startTime:
      war.startTime ||
      null,

    endTime:
      war.endTime ||
      null,

    target,

    enemy,

    clans:
      target && enemy
        ? [target, enemy]
        : [],

    warTag:
      war.warTag || null
  };
}


/* =========================================================
   API FETCH
========================================================= */

async function cocFetch(
  path,
  env
) {
  const token =
    env.COC_API_TOKEN;

  if (!token) {
    throw new Error(
      "COC_API_TOKEN belum tersedia."
    );
  }

  const response =
    await fetch(
      COC_API + path,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,

          Accept:
            "application/json"
        }
      }
    );

  const text =
    await response.text();

  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    data = {
      message: text
    };
  }

  if (!response.ok) {
    const bodyMessage =
      String(
        data.reason ||
        data.message ||
        ""
      ).trim();

    const preview =
      bodyMessage
        .replace(/\s+/g, " ")
        .slice(0, 180);

    if (response.status === 500 || response.status === 525) {
      throw new Error(
        "Server Clash of Clans sedang mengalami gangguan atau sedang down. Silakan coba lagi nanti."
      );
    }

    throw new Error(
      `CoC API HTTP ${response.status} (${new URL(COC_API + path).hostname})` +
      (
        preview
          ? `: ${preview}`
          : ""
      )
    );
  }

  return data;
}


/* =========================================================
   PLAYER
========================================================= */

async function getPlayer(
  tag,
  env
) {
  const player =
    await cocFetch(
      `/players/${encodedTag(tag)}`,
      env
    );

  return normalizePlayer(
    player
  );
}


/* =========================================================
   CLAN
========================================================= */

async function getClan(
  tag,
  env
) {
  const clan =
    await cocFetch(
      `/clans/${encodedTag(tag)}`,
      env
    );

  return clan;
}


/* =========================================================
   CWL GROUP
========================================================= */

async function getLeagueGroup(
  tag,
  env
) {
  return cocFetch(
    `/clans/${encodedTag(tag)}/currentwar/leaguegroup`,
    env
  );
}


/* =========================================================
   CWL WAR
========================================================= */

async function getLeagueWar(
  warTag,
  env,
  wantedTag = null
) {
  if (!isRealWarTag(warTag)) {
    return null;
  }

  try {
    const war =
      await cocFetch(
        `/clanwarleagues/wars/${encodedTag(warTag)}`,
        env
      );

    const normalized =
      normalizeWar(
        war,
        wantedTag
      );

    if (
      normalized &&
      !normalized.warTag
    ) {
      normalized.warTag =
        cleanTag(warTag);
    }

    return normalized;
  } catch (error) {
    return {
      warTag:
        cleanTag(warTag),

      error:
        error instanceof Error
          ? error.message
          : String(error),

      unavailable:
        true
    };
  }
}


/* =========================================================
   CWL ROSTER SNAPSHOT
========================================================= */

function buildCwlRosterSnapshots(
  leagueGroup,
  clanDetailsMap
) {
  const result = {};

  if (
    !leagueGroup ||
    !Array.isArray(
      leagueGroup.clans
    )
  ) {
    return result;
  }

  for (
    const leagueClan
    of leagueGroup.clans
  ) {
    const tag =
      cleanTag(
        leagueClan.tag
      );

    const detail =
      clanDetailsMap[tag];

    if (!detail) {
      continue;
    }

    const members =
      Array.isArray(
        detail.memberList
      )
        ? detail.memberList
        : [];

    result[tag] =
      members;
  }

  return result;
}


/* =========================================================
   CWL
========================================================= */

async function getCWL(
  tag,
  env
) {
  const wantedTag =
    cleanTag(tag);

  const leagueGroup =
    await getLeagueGroup(
      wantedTag,
      env
    );

  const groupClans =
    Array.isArray(
      leagueGroup.clans
    )
      ? leagueGroup.clans
      : [];

  const clanDetailsMap = {};

  await Promise.all(
    groupClans.map(
      async leagueClan => {
        const clanTag =
          cleanTag(
            leagueClan.tag
          );

        try {
          const detail =
            await getClan(
              clanTag,
              env
            );

          clanDetailsMap[
            clanTag
          ] =
            normalizeClan(
              detail
            );
        } catch {
          clanDetailsMap[
            clanTag
          ] =
            normalizeCWLClan(
              leagueClan
            );
        }
      }
    )
  );

  const rosterSnapshots =
    buildCwlRosterSnapshots(
      leagueGroup,
      clanDetailsMap
    );

  const clans =
    groupClans.map(
      leagueClan => {
        const clanTag =
          cleanTag(
            leagueClan.tag
          );

        const detail =
          clanDetailsMap[
            clanTag
          ];

        return normalizeCWLClan(
          detail || leagueClan,
          rosterSnapshots[
            clanTag
          ] || null
        );
      }
    );

  const warTags =
    Array.isArray(
      leagueGroup.rounds
    )
      ? leagueGroup.rounds
          .flatMap(
            round =>
              Array.isArray(
                round.warTags
              )
                ? round.warTags
                : []
          )
          .filter(
            isRealWarTag
          )
      : [];

  const uniqueWarTags =
    [
      ...new Set(
        warTags.map(
          cleanTag
        )
      )
    ];

  const wars =
    await Promise.all(
      uniqueWarTags.map(
        warTag =>
          getLeagueWar(
            warTag,
            env,
            wantedTag
          )
      )
    );

  const warMap = {};

  for (
    const war
    of wars
  ) {
    if (!war) {
      continue;
    }

    warMap[
      cleanTag(
        war.warTag
      )
    ] =
      war;
  }

  return {
    ok: true,

    tag:
      wantedTag,

    clan:
      clanDetailsMap[
        wantedTag
      ] || null,

    leagueGroup,

    clans,

    rosterSnapshots,

    wars,

    warMap
  };
}


/* =========================================================
   PLAYER CHECKER
========================================================= */

async function checkPlayer(
  tag,
  env
) {
  const player =
    await getPlayer(
      tag,
      env
    );

  if (!player) {
    throw new Error(
      "Player tidak ditemukan."
    );
  }

  return {
    ok: true,
    player
  };
}


/* =========================================================
   CLAN CHECKER
========================================================= */

async function checkClan(
  tag,
  env
) {
  const clan =
    await getClan(
      tag,
      env
    );

  if (!clan) {
    throw new Error(
      "Clan tidak ditemukan."
    );
  }

  const normalized =
    normalizeClan(
      clan
    );

  return {
    ok: true,
    clan:
      normalized
  };
}


/* =========================================================
   ROUTER
========================================================= */

function parsePath(
  url
) {
  return url.pathname
    .replace(
      /^\/+/,
      ""
    )
    .replace(
      /\/+$/,
      ""
    )
    .split("/")
    .filter(Boolean);
}


async function handleRequest(
  request,
  env
) {
  const url =
    new URL(
      request.url
    );

  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status: 204,
        headers:
          corsHeaders(
            request
          )
      }
    );
  }

  if (
    request.method !==
    "GET"
  ) {
    return errorResponse(
      request,
      "Method tidak diizinkan.",
      405
    );
  }

  const parts =
    parsePath(
      url
    );

  if (
    parts.length === 0
  ) {
    return json(
      {
        ok: true,
        service:
          "Sarjana Checker API",
        version:
          "2026.10"
      },
      request
    );
  }

  try {
    if (
      parts[0] ===
      "player" &&
      parts[1]
    ) {
      return json(
        await checkPlayer(
          decodeURIComponent(
            parts
              .slice(1)
              .join("/")
          ),
          env
        ),
        request
      );
    }

    if (
      parts[0] ===
      "clan" &&
      parts[1]
    ) {
      return json(
        await checkClan(
          decodeURIComponent(
            parts
              .slice(1)
              .join("/")
          ),
          env
        ),
        request
      );
    }

    if (
      parts[0] ===
      "cwl" &&
      parts[1]
    ) {
      return json(
        await getCWL(
          decodeURIComponent(
            parts
              .slice(1)
              .join("/")
          ),
          env
        ),
        request
      );
    }

    return errorResponse(
      request,
      "Endpoint tidak ditemukan.",
      404
    );
  } catch (error) {
    return errorResponse(
      request,
      error instanceof Error
        ? error.message
        : String(error),
      500
    );
  }
}


/* =========================================================
   EXPORT
========================================================= */

export default {
  async fetch(
    request,
    env
  ) {
    return handleRequest(
      request,
      env
    );
  }
};
