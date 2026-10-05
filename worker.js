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
   Roster = daftar pemain yang didaftarkan untuk CWL.
   Member clan saat ini (memberList dari /clans) SENGAJA
   tidak dipakai, karena bisa berubah selama CWL.
========================================================= */

function normalizeCWLClan(
  clan,
  roster = []
) {
  if (!clan) {
    return null;
  }

  const cwlRoster =
    Array.isArray(roster)
      ? roster
      : [];

  const breakdown =
    townHallBreakdown(
      cwlRoster
    );

  return {
    tag: clan.tag,
    name: clan.name,

    clanLevel:
      number(clan.clanLevel),

    members:
      cwlRoster.length,

    memberList:
      cwlRoster,

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

    cwlRoster,

    cwlRosterSize:
      cwlRoster.length,

    townHallBreakdown:
      breakdown,

    cwlTownHallBreakdown:
      breakdown
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
   - batas waktu per request
   - coba ulang otomatis kalau proxy sedang gangguan
   - "budget" membatasi jumlah request per kunjungan
     (Cloudflare membatasi jumlah subrequest)
========================================================= */

const TIMEOUT_MS = 7000;
const MAX_ATTEMPTS = 3;

const RETRY_STATUS =
  new Set([429, 500, 502, 503, 504, 525]);

const DOWN_STATUS =
  new Set([500, 502, 503, 504, 525]);

const DOWN_MESSAGE =
  "Server Clash of Clans sedang mengalami gangguan atau sedang down. Silakan coba lagi nanti 🙂";


function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}


function apiError(message, status) {
  const error = new Error(message);

  error.status = status;

  return error;
}


async function cocFetch(
  path,
  env,
  budget = null
) {
  const token =
    env.COC_API_TOKEN;

  if (!token) {
    throw apiError(
      "COC_API_TOKEN belum tersedia.",
      0
    );
  }

  let lastError = null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    if (budget) {
      if (budget.left <= 0) {
        throw lastError || apiError(
          "Terlalu banyak permintaan ke server Clash of Clans. Coba lagi sebentar lagi 🙂",
          0
        );
      }

      budget.left--;
    }

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () => controller.abort(),
        TIMEOUT_MS
      );

    let response;
    let text;

    try {
      response =
        await fetch(
          COC_API + path,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json"
            },

            signal:
              controller.signal
          }
        );

      text =
        await response.text();
    } catch {
      lastError = apiError(
        DOWN_MESSAGE,
        0
      );

      if (attempt < MAX_ATTEMPTS) {
        await sleep(350 * attempt);
        continue;
      }

      throw lastError;
    } finally {
      clearTimeout(timer);
    }

    let data;

    try {
      data =
        JSON.parse(text);
    } catch {
      data = {
        message: text
      };
    }

    if (response.ok) {
      return data;
    }

    if (DOWN_STATUS.has(response.status)) {
      lastError = apiError(
        DOWN_MESSAGE,
        response.status
      );
    } else {
      const bodyMessage =
        String(
          (data && (data.reason || data.message)) ||
          ""
        ).trim();

      const preview =
        bodyMessage
          .replace(/\s+/g, " ")
          .slice(0, 180);

      lastError = apiError(
        `CoC API HTTP ${response.status} (${new URL(COC_API + path).hostname})` +
        (
          preview
            ? `: ${preview}`
            : ""
        ),
        response.status
      );
    }

    if (
      RETRY_STATUS.has(response.status) &&
      attempt < MAX_ATTEMPTS
    ) {
      await sleep(350 * attempt);
      continue;
    }

    throw lastError;
  }

  throw lastError || apiError(DOWN_MESSAGE, 0);
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
  env,
  budget = null
) {
  const clan =
    await cocFetch(
      `/clans/${encodedTag(tag)}`,
      env,
      budget
    );

  return clan;
}


/* =========================================================
   CWL GROUP
========================================================= */

async function getLeagueGroup(
  tag,
  env,
  budget = null
) {
  return cocFetch(
    `/clans/${encodedTag(tag)}/currentwar/leaguegroup`,
    env,
    budget
  );
}


/* =========================================================
   CWL WAR
========================================================= */

async function getLeagueWar(
  warTag,
  env,
  wantedTag = null,
  budget = null
) {
  if (!isRealWarTag(warTag)) {
    return null;
  }

  try {
    const war =
      await cocFetch(
        `/clanwarleagues/wars/${encodedTag(warTag)}`,
        env,
        budget
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
   CWL ROSTER ASLI (dari leaguegroup)
   Daftar pemain yang didaftarkan tiap clan saat CWL
   dimulai. Ini BUKAN member clan saat ini.
========================================================= */

function buildLeagueRosters(
  leagueGroup
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

    const members =
      Array.isArray(
        leagueClan.members
      )
        ? leagueClan.members
        : [];

    result[tag] =
      members
        .filter(Boolean)
        .map(member => ({
          tag:
            member.tag,

          name:
            member.name,

          townHallLevel:
            number(
              firstValue(
                member.townHallLevel,
                member.townhallLevel
              )
            )
        }));
  }

  return result;
}


/* =========================================================
   KV HELPERS
========================================================= */

async function kvGet(
  env,
  key
) {
  if (!env.CWL_ROSTER) {
    return null;
  }

  try {
    return await env.CWL_ROSTER.get(
      key,
      "json"
    );
  } catch {
    return null;
  }
}


async function kvPut(
  env,
  key,
  value,
  options = undefined
) {
  if (!env.CWL_ROSTER) {
    return false;
  }

  try {
    await env.CWL_ROSTER.put(
      key,
      JSON.stringify(value),
      options
    );

    return true;
  } catch {
    return false;
  }
}


/* =========================================================
   CWL ROUND WAR TAGS
   Satu ronde CWL berisi beberapa warTag (4 war untuk
   8 clan). Ambil semuanya, bukan cuma yang pertama.
========================================================= */

function roundWarTagList(round) {
  const raw = [];

  if (Array.isArray(round?.warTags)) {
    raw.push(...round.warTags);
  }

  if (round?.warTag) {
    raw.push(round.warTag);
  }

  return [
    ...new Set(
      raw
        .filter(Boolean)
        .map(cleanTag)
        .filter(isRealWarTag)
    )
  ];
}


/* =========================================================
   CWL SEASON KEY
========================================================= */

function cwlSeasonKey(
  leagueGroup
) {
  if (!leagueGroup) {
    return "unknown";
  }

  const season =
    firstValue(
      leagueGroup.season,
      leagueGroup.seasonId,
      leagueGroup.id
    );

  if (season) {
    return String(season);
  }

  const clans =
    Array.isArray(
      leagueGroup.clans
    )
      ? leagueGroup.clans
      : [];

  const first =
    clans[0];

  return String(
    firstValue(
      first?.tag,
      "unknown"
    )
  );
}
/* =========================================================
   CWL DATA
========================================================= */

function emptyCwl(
  wantedTag,
  state
) {
  return {
    ok: true,

    tag: wantedTag,

    state:
      state || "notInWar",

    season: null,

    clans: [],

    selectedClan: null,

    rounds: [],

    completedRounds: 0,

    totalRounds: 0,

    hasWarData: false,

    rosterSource: "none",

    roster: [],

    rosterSize: 0,

    cwlRoster: [],

    cwlRosterSize: 0,

    cwlTownHallBreakdown:
      townHallBreakdown([])
  };
}


/*
 * Ambil war tiap ronde. Dalam satu ronde ada beberapa
 * warTag (4 war untuk 8 clan); dicari satu per satu
 * sampai ketemu war milik clan yang dicari, supaya
 * request ke proxy tidak berlebihan.
 */

async function loadRounds(
  leagueGroup,
  wantedTag,
  env,
  budget
) {
  const sourceRounds =
    Array.isArray(
      leagueGroup.rounds
    )
      ? leagueGroup.rounds
      : [];

  return Promise.all(
    sourceRounds.map(
      async (round, index) => {
        const tags =
          roundWarTagList(round);

        let war = null;
        let failed = 0;
        let lastError = null;

        for (const warTag of tags) {
          const result =
            await getLeagueWar(
              warTag,
              env,
              wantedTag,
              budget
            );

          if (!result) {
            continue;
          }

          if (result.unavailable) {
            failed++;
            lastError = result.error;
            continue;
          }

          war = result;
          break;
        }

        return {
          round:
            index + 1,

          warTag:
            war?.warTag ||
            tags[0] ||
            null,

          state:
            war?.state ||
            (
              failed
                ? "unavailable"
                : "notAvailable"
            ),

          available:
            !!war,

          unavailable:
            !war && failed > 0,

          error:
            !war && failed > 0
              ? lastError
              : null,

          war
        };
      }
    )
  );
}


function addWarMembers(
  target,
  side
) {
  if (!side?.tag) {
    return;
  }

  const tag =
    cleanTag(side.tag);

  target[tag] =
    target[tag] || {};

  for (
    const member
    of side.members || []
  ) {
    if (!member?.tag) {
      continue;
    }

    target[tag][member.tag] = {
      tag:
        member.tag,

      name:
        member.name,

      townHallLevel:
        number(
          firstValue(
            member.townhallLevel,
            member.townHallLevel
          )
        )
    };
  }
}


function rosterSignature(rosters) {
  return JSON.stringify(
    Object.keys(rosters)
      .sort()
      .map(tag => [
        tag,
        rosters[tag]
          .map(m => m.tag)
          .sort()
      ])
  );
}


async function getCWL(
  tag,
  env
) {
  const wantedTag =
    cleanTag(tag);

  if (wantedTag === "#") {
    throw new Error(
      "Clan tag tidak valid."
    );
  }

  const budget = {
    left: 40
  };


  /* =======================================================
     1. CURRENT CWL GROUP
  ======================================================= */

  let leagueGroup = null;

  try {
    leagueGroup =
      await getLeagueGroup(
        wantedTag,
        env,
        budget
      );
  } catch (error) {
    if (
      error &&
      error.status === 404
    ) {
      return emptyCwl(
        wantedTag,
        "notInWar"
      );
    }

    throw error;
  }

  if (
    !leagueGroup ||
    !Array.isArray(
      leagueGroup.clans
    ) ||
    !leagueGroup.clans.length
  ) {
    return emptyCwl(
      wantedTag,
      leagueGroup?.state
    );
  }

  const state =
    leagueGroup.state || null;

  const season =
    cwlSeasonKey(
      leagueGroup
    );

  /*
   * Roster yang didaftarkan untuk CWL, semua clan.
   */

  const leagueRosters =
    buildLeagueRosters(
      leagueGroup
    );

  /*
   * Key baru (cwl2) supaya snapshot lama yang
   * isinya member clan saat ini tidak terpakai.
   */

  const snapshotKey =
    `cwl2:${season}:${wantedTag}`;


  /* =======================================================
     2. PARALEL: snapshot KV, detail clan, war tiap ronde
  ======================================================= */

  const [
    snapshotRaw,
    detail,
    rounds
  ] = await Promise.all([
    kvGet(
      env,
      snapshotKey
    ),

    getClan(
      wantedTag,
      env,
      budget
    ).catch(() => null),

    loadRounds(
      leagueGroup,
      wantedTag,
      env,
      budget
    )
  ]);

  const snapshot =
    snapshotRaw &&
    typeof snapshotRaw === "object" &&
    !Array.isArray(snapshotRaw) &&
    snapshotRaw.rosters &&
    typeof snapshotRaw.rosters === "object"
      ? snapshotRaw
      : null;


  /* =======================================================
     3. SIMPAN SNAPSHOT (cadangan)
     Selama preparation boleh diperbarui. Setelah itu
     hanya ditulis kalau belum ada.
  ======================================================= */

  const freshRosters = {};

  for (
    const [clanTag, list]
    of Object.entries(leagueRosters)
  ) {
    if (list.length) {
      freshRosters[clanTag] = list;
    }
  }

  if (
    Object.keys(freshRosters).length
  ) {
    const isPreparation =
      String(state || "")
        .toLowerCase() ===
      "preparation";

    const needsWrite =
      !snapshot ||
      (
        isPreparation &&
        rosterSignature(freshRosters) !==
        rosterSignature(
          snapshot.rosters
        )
      );

    if (needsWrite) {
      await kvPut(
        env,
        snapshotKey,
        {
          v: 2,
          season,
          state,
          savedAt:
            new Date().toISOString(),
          rosters:
            freshRosters
        },
        {
          expirationTtl:
            60 * 24 * 60 * 60
        }
      );
    }
  }


  /* =======================================================
     4. ROSTER PER CLAN
     Urutan: leaguegroup -> snapshot -> data war
  ======================================================= */

  const warMembers = {};

  for (const round of rounds) {
    if (!round.war) {
      continue;
    }

    addWarMembers(
      warMembers,
      round.war.target
    );

    addWarMembers(
      warMembers,
      round.war.enemy
    );
  }

  function resolveRoster(clanTag) {
    const fromGroup =
      leagueRosters[clanTag];

    if (fromGroup?.length) {
      return {
        list: fromGroup,
        source: "leaguegroup"
      };
    }

    const fromSnapshot =
      snapshot?.rosters?.[clanTag];

    if (fromSnapshot?.length) {
      return {
        list: fromSnapshot,
        source: "snapshot"
      };
    }

    const fromWars =
      warMembers[clanTag]
        ? Object.values(
            warMembers[clanTag]
          )
        : [];

    if (fromWars.length) {
      return {
        list: fromWars,
        source: "wars"
      };
    }

    return {
      list: [],
      source: "none"
    };
  }


  /* =======================================================
     5. KUMPULKAN CLAN (8 clan CWL)
  ======================================================= */

  const entries = [];
  const seen = new Set();

  for (
    const leagueClan
    of leagueGroup.clans
  ) {
    const clanTag =
      cleanTag(
        leagueClan.tag
      );

    if (
      !clanTag ||
      seen.has(clanTag)
    ) {
      continue;
    }

    seen.add(clanTag);

    entries.push({
      tag: clanTag,
      base: leagueClan
    });
  }

  /*
   * Jaga-jaga: clan yang muncul di data war tapi
   * tidak ada di leaguegroup.
   */

  for (const round of rounds) {
    if (!round.war) {
      continue;
    }

    for (
      const side
      of [
        round.war.target,
        round.war.enemy
      ]
    ) {
      if (!side?.tag) {
        continue;
      }

      const clanTag =
        cleanTag(side.tag);

      if (seen.has(clanTag)) {
        continue;
      }

      seen.add(clanTag);

      entries.push({
        tag: clanTag,
        base: side
      });
    }
  }

  const normalizedClans =
    entries.map(
      ({ tag: clanTag, base }) => {
        const resolved =
          resolveRoster(clanTag);

        const source =
          clanTag === wantedTag &&
          detail
            ? {
                ...base,
                ...detail
              }
            : base;

        return {
          ...normalizeCWLClan(
            {
              ...source,
              tag: clanTag
            },
            resolved.list
          ),

          rosterSource:
            resolved.source
        };
      }
    );

  const selectedClan =
    normalizedClans.find(
      clan =>
        cleanTag(clan.tag) ===
        wantedTag
    ) || null;

  const wantedRoster =
    resolveRoster(wantedTag);


  /* =======================================================
     6. RESPONSE
  ======================================================= */

  const completedRounds =
    rounds.filter(
      round =>
        round.war &&
        round.war.state === "warEnded"
    ).length;

  const hasWarData =
    rounds.some(
      round => !!round.war
    );

  return {
    ok: true,

    tag:
      wantedTag,

    state,

    season,

    warLeague:
      leagueGroup.warLeague ||
      null,

    clans:
      normalizedClans,

    selectedClan,

    rounds,

    completedRounds,

    totalRounds:
      rounds.length,

    hasWarData,

    rosterSource:
      wantedRoster.source,

    roster:
      wantedRoster.list,

    rosterSize:
      wantedRoster.list.length,

    /*
     * Dibaca frontend untuk "Peserta CWL" dan
     * "Town Hall Breakdown".
     */

    cwlRoster:
      wantedRoster.list,

    cwlRosterSize:
      wantedRoster.list.length,

    cwlTownHallBreakdown:
      townHallBreakdown(
        wantedRoster.list
      )
  };
}


/* =========================================================
   ROUTER
========================================================= */

export default {
  async fetch(
    request,
    env
  ) {
    try {
      /*
       * CORS preflight
       */

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


      /*
       * Hanya GET
       */

      if (
        request.method !==
        "GET"
      ) {
        return errorResponse(
          request,
          "Method tidak didukung.",
          405
        );
      }


      const url =
        new URL(
          request.url
        );

      const pathname =
        url.pathname;


      /* ===================================================
         ROOT
      =================================================== */

      if (
        pathname === "/" ||
        pathname === ""
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


      /* ===================================================
         PLAYER
      =================================================== */

      if (
        pathname === "/player"
      ) {
        const tag =
          url.searchParams.get(
            "tag"
          );

        if (!tag) {
          return errorResponse(
            request,
            "Parameter tag wajib diisi."
          );
        }

        try {
          const player =
            await getPlayer(
              tag,
              env
            );

          return json(
            {
              ok: true,

              player
            },
            request
          );
        } catch (error) {
          return errorResponse(
            request,

            error instanceof Error
              ? error.message
              : String(error),

            502
          );
        }
      }


      /* ===================================================
         CLAN
      =================================================== */

      if (
        pathname === "/clan"
      ) {
        const tag =
          url.searchParams.get(
            "tag"
          );

        if (!tag) {
          return errorResponse(
            request,
            "Parameter tag wajib diisi."
          );
        }

        try {
          const clan =
            await getClan(
              tag,
              env
            );

          return json(
            {
              ok: true,

              clan:
                normalizeClan(
                  clan
                )
            },
            request
          );
        } catch (error) {
          return errorResponse(
            request,

            error instanceof Error
              ? error.message
              : String(error),

            502
          );
        }
      }


      /* ===================================================
         CWL
      =================================================== */

      if (
        pathname === "/cwl"
      ) {
        const tag =
          url.searchParams.get(
            "tag"
          );

        if (!tag) {
          return errorResponse(
            request,
            "Parameter tag wajib diisi."
          );
        }

        try {
          const cwl =
            await getCWL(
              tag,
              env
            );

          return json(
            cwl,
            request
          );
        } catch (error) {
          return errorResponse(
            request,

            error instanceof Error
              ? error.message
              : String(error),

            502
          );
        }
      }


      /* ===================================================
         UNKNOWN ROUTE
      =================================================== */

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
};
