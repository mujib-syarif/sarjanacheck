const COC_API = "https://cocproxy.royaleapi.dev/v1";

const ALLOWED_ORIGIN = "https://mujib-syarif.github.io";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":
      origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
}

function cleanTag(value) {
  if (!value) return "";

  let tag = String(value).trim();

  try {
    tag = decodeURIComponent(tag);
  } catch (_) {}

  tag = tag.toUpperCase();

  if (!tag.startsWith("#")) {
    tag = "#" + tag;
  }

  return tag;
}

function isRealWarTag(tag) {
  if (!tag) return false;

  const value = String(tag).trim().toUpperCase();

  return value !== "#0" && value !== "0";
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeBadge(badgeUrls) {
  if (!badgeUrls || typeof badgeUrls !== "object") {
    return {};
  }

  return {
    small: badgeUrls.small || "",
    medium: badgeUrls.medium || "",
    large: badgeUrls.large || "",
  };
}

function townHallBreakdown(members = []) {
  const result = {};

  for (let th = 8; th <= 18; th++) {
    result[String(th)] = 0;
  }

  for (const member of members || []) {
    const th = number(
      member.townHallLevel ??
      member.townhallLevel ??
      member.townHall ??
      0
    );

    if (th >= 8 && th <= 18) {
      result[String(th)]++;
    }
  }

  return result;
}

function normalizeCWLClan(clan) {
  const members = Array.isArray(clan?.members)
    ? clan.members
    : [];

  return {
    tag: clan?.tag || "",
    name: clan?.name || "-",
    clanLevel: number(clan?.clanLevel),
    badgeUrls: normalizeBadge(clan?.badgeUrls),
    memberCount: members.length,
    members: members.map((member) => ({
      tag: member.tag || "",
      name: member.name || "-",
      townHallLevel: number(member.townHallLevel),
    })),
    townHallBreakdown: townHallBreakdown(members),
  };
}

function normalizeWarClan(clan) {
  if (!clan) {
    return {
      tag: "",
      name: "-",
      clanLevel: 0,
      badgeUrls: {},
      teamSize: 0,
      attacks: 0,
      stars: 0,
      destructionPercentage: 0,
      members: [],
      memberCount: 0,
      townHallBreakdown: townHallBreakdown([]),
    };
  }

  const members = Array.isArray(clan.members)
    ? clan.members
    : [];

  return {
    tag: clan.tag || "",
    name: clan.name || "-",
    clanLevel: number(clan.clanLevel),
    badgeUrls: normalizeBadge(clan.badgeUrls),

    teamSize: number(clan.members?.length || clan.teamSize),

    attacks: number(clan.attacks),
    stars: number(clan.stars),
    destructionPercentage: number(
      clan.destructionPercentage
    ),

    members: members.map((member) => ({
      tag: member.tag || "",
      name: member.name || "-",
      townHallLevel: number(member.townHallLevel),

      mapPosition: number(member.mapPosition),

      attacks: Array.isArray(member.attacks)
        ? member.attacks.map((attack) => ({
            attackerTag: attack.attackerTag || "",
            defenderTag: attack.defenderTag || "",
            stars: number(attack.stars),
            destructionPercentage: number(
              attack.destructionPercentage
            ),
            order: number(attack.order),
          }))
        : [],
    })),

    memberCount: members.length,

    townHallBreakdown: townHallBreakdown(members),
  };
}

function normalizeWar(war, requestedTag) {
  if (!war) return null;

  let clan = war.clan || null;
  let opponent = war.opponent || null;

  /*
    The API may orient the requested clan differently.
    Make sure the requested clan is always "clan".
  */

  const wanted = cleanTag(requestedTag);

  if (
    clan?.tag &&
    cleanTag(clan.tag) !== wanted &&
    opponent?.tag &&
    cleanTag(opponent.tag) === wanted
  ) {
    const temp = clan;
    clan = opponent;
    opponent = temp;
  }

  return {
    tag: war.tag || "",
    state: war.state || "unknown",

    teamSize: number(war.teamSize),

    preparationStartTime:
      war.preparationStartTime || null,

    startTime:
      war.startTime || null,

    endTime:
      war.endTime || null,

    battleModifier:
      war.battleModifier || null,

    clan: normalizeWarClan(clan),
    opponent: normalizeWarClan(opponent),
  };
}

async function getCoC(path, env) {
  const token = env.COC_API_TOKEN;

  if (!token) {
    throw new Error(
      "COC_API_TOKEN belum tersedia di Worker."
    );
  }

  const response = await fetch(
    `${COC_API}${path}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "User-Agent": "SarjanaChecker/1.0",
      },
    }
  );

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = {
      message: text || "Invalid API response",
    };
  }

  if (!response.ok) {
    const error = new Error(
      data?.reason ||
      data?.message ||
      `CoC API HTTP ${response.status}`
    );

    error.status = response.status;
    error.body = data;

    throw error;
  }

  return data;
}

async function getPlayer(tag, env) {
  return await getCoC(
    `/players/${encodeURIComponent(tag)}`,
    env
  );
}

async function getClan(tag, env) {
  return await getCoC(
    `/clans/${encodeURIComponent(tag)}`,
    env
  );
}

async function getWar(warTag, env) {
  return await getCoC(
    `/clanwarleagues/wars/${encodeURIComponent(warTag)}`,
    env
  );
}

function getRoleName(role) {
  const value = String(role || "").toLowerCase();

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

function normalizePlayer(player) {
  if (!player) return null;

  return {
    ...player,

    roleName: getRoleName(player.role),

    heroEquipment:
      Array.isArray(player.heroEquipment)
        ? player.heroEquipment
        : [],

    heroes:
      Array.isArray(player.heroes)
        ? player.heroes
        : [],
  };
}

async function getCWL(tag, env) {
  const clean = cleanTag(tag);

  /*
    1. Get CWL league group
  */

  const group = await getCoC(
    `/clans/${encodeURIComponent(clean)}/currentwar/leaguegroup`,
    env
  );

  /*
    2. Current clan information
  */

  let currentClan = null;

  try {
    currentClan = await getClan(clean, env);
  } catch (_) {
    currentClan = null;
  }

  /*
    3. CWL clans
       IMPORTANT:
       leaguegroup.clans[].members is the frozen
       CWL roster. This is what we use for
       Town Hall Breakdown.
  */

  const clans = Array.isArray(group.clans)
    ? group.clans.map(normalizeCWLClan)
    : [];

  /*
    4. CWL normally has 7 battle rounds.
       Future rounds may not yet have real war tags.
       We intentionally keep all 7 rounds.
  */

  const TOTAL_ROUNDS = 7;

  const rawRounds = Array.isArray(group.rounds)
    ? group.rounds
    : [];

  const rounds = [];

  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const rawRound = rawRounds[i] || {};

    const warTags = Array.isArray(rawRound.warTags)
      ? rawRound.warTags
          .filter(isRealWarTag)
          .map((x) => String(x))
      : [];

    rounds.push({
      round: i + 1,
      warTags,
      available: warTags.length > 0,
    });
  }

  /*
    5. Fetch every currently available war.
       Deduplicate war tags.
  */

  const uniqueWarTags = [
    ...new Set(
      rounds.flatMap((round) => round.warTags)
    ),
  ];

  const warResults = await Promise.all(
    uniqueWarTags.map(async (warTag) => {
      try {
        const war = await getWar(warTag, env);

        return {
          warTag,
          ok: true,
          data: normalizeWar(war, clean),
        };
      } catch (error) {
        return {
          warTag,
          ok: false,
          error: error?.message || "War fetch failed",
          status: error?.status || 500,
          data: null,
        };
      }
    })
  );

  const warMap = new Map();

  for (const result of warResults) {
    warMap.set(
      result.warTag,
      result
    );
  }

  /*
    6. Attach actual war data to each round.
  */

  const finalRounds = rounds.map((round) => {
    const wars = [];

    for (const warTag of round.warTags) {
      const result = warMap.get(warTag);

      if (!result) {
        continue;
      }

      wars.push({
        warTag,

        ok: result.ok,

        error: result.error || null,

        data: result.data || null,
      });
    }

    return {
      ...round,
      wars,
    };
  });

  /*
    7. TH breakdown comes from the frozen CWL roster,
       NOT from individual war responses.
  */

  const finalClans = clans.map((clan) => ({
    ...clan,
    townHallBreakdown:
      townHallBreakdown(clan.members),
  }));

  /*
    8. Build quick summary.
  */

  const availableRounds =
    finalRounds.filter(
      (round) => round.available
    ).length;

  const completedRounds =
    finalRounds.filter((round) =>
      round.wars.some(
        (war) =>
          war.data?.state === "warEnded"
      )
    ).length;

  const activeRounds =
    finalRounds.filter((round) =>
      round.wars.some(
        (war) =>
          war.data?.state === "inWar"
      )
    ).length;

  const preparationRounds =
    finalRounds.filter((round) =>
      round.wars.some(
        (war) =>
          war.data?.state === "preparation"
      )
    ).length;

  return {
    ok: true,

    clanTag: clean,

    state:
      group.state || "unknown",

    season:
      group.season || null,

    totalRounds: TOTAL_ROUNDS,

    availableRounds,

    completedRounds,

    activeRounds,

    preparationRounds,

    clans: finalClans,

    rounds: finalRounds,

    currentClan: currentClan
      ? {
          tag: currentClan.tag || clean,
          name: currentClan.name || "-",
          description:
            currentClan.description || "",
          clanLevel:
            number(currentClan.clanLevel),
          members:
            number(currentClan.members),
          badgeUrls:
            normalizeBadge(
              currentClan.badgeUrls
            ),
          warLeague:
            currentClan.warLeague || null,
          type:
            currentClan.type || null,
        }
      : null,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const origin =
      request.headers.get("Origin") || "";

    /*
      CORS preflight
    */

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    if (request.method !== "GET") {
      return json(
        {
          ok: false,
          message: "Method not allowed",
        },
        405,
        origin
      );
    }

    try {
      /*
        PLAYER
        /player?tag=%239UG9LJV8Y
      */

      if (url.pathname === "/player") {
        const tag = cleanTag(
          url.searchParams.get("tag")
        );

        if (!tag) {
          return json(
            {
              ok: false,
              message:
                "Player tag belum diberikan.",
            },
            400,
            origin
          );
        }

        const player =
          await getPlayer(tag, env);

        return json(
          {
            ok: true,
            data: normalizePlayer(player),
          },
          200,
          origin
        );
      }

      /*
        CLAN
        /clan?tag=%232J0P2GR08
      */

      if (url.pathname === "/clan") {
        const tag = cleanTag(
          url.searchParams.get("tag")
        );

        if (!tag) {
          return json(
            {
              ok: false,
              message:
                "Clan tag belum diberikan.",
            },
            400,
            origin
          );
        }

        const clan =
          await getClan(tag, env);

        return json(
          {
            ok: true,
            data: clan,
          },
          200,
          origin
        );
      }

      /*
        CWL
        /cwl?tag=%232J0P2GR08
      */

      if (url.pathname === "/cwl") {
        const tag = cleanTag(
          url.searchParams.get("tag")
        );

        if (!tag) {
          return json(
            {
              ok: false,
              message:
                "Clan tag belum diberikan.",
            },
            400,
            origin
          );
        }

        const data =
          await getCWL(tag, env);

        return json(
          data,
          200,
          origin
        );
      }

      /*
        HEALTH
      */

      if (url.pathname === "/") {
        return json(
          {
            ok: true,
            app: "Sarjana Checker API",
            version: "2.0",
            endpoints: [
              "/player?tag=%23PLAYER_TAG",
              "/clan?tag=%23CLAN_TAG",
              "/cwl?tag=%23CLAN_TAG",
            ],
          },
          200,
          origin
        );
      }

      return json(
        {
          ok: false,
          message: "Endpoint not found.",
        },
        404,
        origin
      );
    } catch (error) {
      console.error(error);

      return json(
        {
          ok: false,
          message:
            error?.message ||
            "Terjadi kesalahan.",
          status:
            error?.status || 500,
          details:
            error?.body || null,
        },
        error?.status || 500,
        origin
      );
    }
  },
};
