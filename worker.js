const COC_API = "https://cocproxy.royaleapi.dev/v1";

const ALLOWED_ORIGIN =
  "https://mujib-syarif.github.io";

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

    league:
      player.league || null,

    leagueTier:
      player.leagueTier || null,

    builderBaseLeague:
      player.builderBaseLeague || null,

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

    heroes,

    heroEquipment
  };
}

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

    type:
      clan.type || null,

    location:
      clan.location || null,

    chatLanguage:
      clan.chatLanguage || null,

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

function normalizeCWLClan(
  clan,
  roster = []
) {
  const currentMembers =
    Array.isArray(clan.memberList)
      ? clan.memberList
      : [];

  const cwlRoster =
    Array.isArray(roster)
      ? roster
      : [];

  return {
    tag: clan.tag,

    name: clan.name,

    clanLevel:
      number(clan.clanLevel),

    members:
      number(clan.members),

    memberList:
      currentMembers,

    badgeUrls:
      normalizeBadge(clan),

    type:
      clan.type || null,

    location:
      clan.location || null,

    chatLanguage:
      clan.chatLanguage || null,

    cwlRoster,

    cwlRosterSize:
      cwlRoster.length,

    cwlTownHallBreakdown:
      townHallBreakdown(
        cwlRoster
      ),

    townHallBreakdown:
      townHallBreakdown(
        cwlRoster
      )
  };
}

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

function normalizeWar(
  war,
  wantedTag = null
) {
  if (!war) {
    return null;
  }

  let target = null;
  let enemy = null;

  if (
    war.clan &&
    war.opponent
  ) {
    const clanSide =
      normalizeWarSide(
        war.clan
      );

    const opponentSide =
      normalizeWarSide(
        war.opponent
      );

    const wanted =
      wantedTag
        ? cleanTag(wantedTag)
        : null;

    if (
      wanted &&
      cleanTag(war.opponent.tag) === wanted
    ) {
      target = opponentSide;
      enemy = clanSide;
    } else {
      target = clanSide;
      enemy = opponentSide;
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
    throw new Error(
      data.reason ||
      data.message ||
      `CoC API HTTP ${response.status}`
    );
  }

  return data;
}

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

async function getLeagueGroup(
  tag,
  env
) {
  return await cocFetch(
    `/clans/${encodedTag(tag)}/currentwar/leaguegroup`,
    env
  );
}

async function getLeagueWar(
  warTag,
  env,
  wantedTag = null
) {
  if (
    !warTag ||
    !isRealWarTag(warTag)
  ) {
    return null;
  }

  try {
    const war =
      await cocFetch(
        `/clanwarleagues/wars/${encodedTag(warTag)}`,
        env
      );

    return normalizeWar(
      war,
      wantedTag
    );

  } catch {
    return null;
  }
}

function buildCwlRosterSnapshots(
  rounds,
  warMap
) {
  const snapshots = {};

  for (
    const round of rounds
  ) {
    const wars =
      Array.isArray(round.wars)
        ? round.wars
        : [];

    for (
      const war of wars
    ) {
      if (!war) continue;

      const sides =
        Array.isArray(war.clans)
          ? war.clans
          : [];

      for (
        const side of sides
      ) {
        if (!side || !side.tag) {
          continue;
        }

        const members =
          Array.isArray(
            side.members
          )
            ? side.members
            : [];

        if (!members.length) {
          continue;
        }

        const tag =
          cleanTag(side.tag);

        if (
          !snapshots[tag]
        ) {
          snapshots[tag] =
            members.map(
              member => ({
                tag:
                  member.tag,

                name:
                  member.name,

                townhallLevel:
                  number(
                    firstValue(
                      member.townHallLevel,
                      member.townhallLevel
                    )
                  ),

                mapPosition:
                  number(
                    member.mapPosition
                  ),

                opponentAttacks:
                  number(
                    member.opponentAttacks
                  )
              })
            );
        }
      }
    }
  }

  return snapshots;
}

async function getStoredCwlRoster(
  env,
  clanTag,
  season
) {
  if (!env.CWL_ROSTER) {
    return null;
  }

  const key =
    `cwl-roster:${cleanTag(clanTag)}:${season}`;

  try {
    const value =
      await env.CWL_ROSTER.get(
        key
      );

    if (!value) {
      return null;
    }

    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : null;

  } catch {
    return null;
  }
}

async function saveCwlRoster(
  env,
  clanTag,
  season,
  members
) {
  if (!env.CWL_ROSTER) {
    return;
  }

  if (
    !Array.isArray(members) ||
    !members.length
  ) {
    return;
  }

  const key =
    `cwl-roster:${cleanTag(clanTag)}:${season}`;

  const roster =
    members.map(
      member => ({
        tag:
          firstValue(
            member.tag,
            member.playerTag,
            ""
          ),

        name:
          firstValue(
            member.name,
            member.playerName,
            "-"
          ),

        townhallLevel:
          number(
            firstValue(
              member.townHallLevel,
              member.townhallLevel,
              member.townHall
            )
          ),

        clanRank:
          number(
            firstValue(
              member.clanRank,
              member.rank
            )
          ),

        role:
          firstValue(
            member.role,
            "member"
          )
      })
    );

  await env.CWL_ROSTER.put(
    key,
    JSON.stringify(roster)
  );
}

async function getCWL(
  clanTag,
  env
) {
  const wantedTag =
    cleanTag(clanTag);

  const leagueGroup =
    await getLeagueGroup(
      wantedTag,
      env
    );

  const season =
    firstValue(
      leagueGroup.season,
      leagueGroup.seasonId,
      new Date()
        .toISOString()
        .slice(0, 7)
    );

  const currentClanRaw =
    await getClan(
      wantedTag,
      env
    );

  const currentMembers =
    Array.isArray(
      currentClanRaw.memberList
    )
      ? currentClanRaw.memberList
      : [];

  let storedRoster =
    await getStoredCwlRoster(
      env,
      wantedTag,
      season
    );

  if (
    !storedRoster &&
    currentMembers.length
  ) {
    await saveCwlRoster(
      env,
      wantedTag,
      season,
      currentMembers
    );

    storedRoster =
      currentMembers.map(
        member => ({
          tag:
            firstValue(
              member.tag,
              member.playerTag,
              ""
            ),

          name:
            firstValue(
              member.name,
              member.playerName,
              "-"
            ),

          townhallLevel:
            number(
              firstValue(
                member.townHallLevel,
                member.townhallLevel,
                member.townHall
              )
            ),

          clanRank:
            number(
              firstValue(
                member.clanRank,
                member.rank
              )
            ),

          role:
            firstValue(
              member.role,
              "member"
            )
        })
      );
  }

  const rawRounds =
    Array.isArray(
      leagueGroup.rounds
    )
      ? leagueGroup.rounds
      : [];

  const rounds =
    Array.from(
      { length: 7 },
      (_, index) => {
        const original =
          rawRounds[index];

        return {
          roundNumber:
            index + 1,

          warTags:
            original &&
            Array.isArray(
              original.warTags
            )
              ? original.warTags
              : [],

          wars: []
        };
      }
    );

  const uniqueWarTags =
    Array.from(
      new Set(
        rounds
          .flatMap(
            round =>
              round.warTags
          )
          .filter(
            isRealWarTag
          )
      )
    );

  const fetchedWars =
    await Promise.all(
      uniqueWarTags.map(
        async warTag => ({
          warTag,

          war:
            await getLeagueWar(
              warTag,
              env,
              wantedTag
            )
        })
      )
    );

  const warMap = {};

  for (
    const item of fetchedWars
  ) {
    warMap[
      cleanTag(item.warTag)
    ] = item.war;
  }

  for (
    const round of rounds
  ) {
    round.wars =
      round.warTags
        .map(
          warTag =>
            warMap[
              cleanTag(warTag)
            ] || null
        )
        .filter(Boolean);
  }

  const snapshots =
    buildCwlRosterSnapshots(
      rounds,
      warMap
    );

  const warRoster =
    snapshots[wantedTag] ||
    [];

  const cwlRoster =
    storedRoster ||
    warRoster ||
    currentMembers;

  const currentClan =
    normalizeCWLClan(
      currentClanRaw,
      cwlRoster
    );

  const clanMap = {};

  for (
    const round of rounds
  ) {
    for (
      const war of round.wars
    ) {
      if (!war) continue;

      const sides =
        Array.isArray(
          war.clans
        )
          ? war.clans
          : [];

      for (
        const side of sides
      ) {
        if (
          !side ||
          !side.tag
        ) {
          continue;
        }

        const tag =
          cleanTag(side.tag);

        if (
          !clanMap[tag]
        ) {
          clanMap[tag] =
            {
              tag,

              name:
                side.name || "-",

              clanLevel:
                number(
                  side.clanLevel
                ),

              badgeUrls:
                normalizeBadge(
                  side
                ),

              type:
                side.type || null,

              location:
                side.location || null,

              chatLanguage:
                side.chatLanguage || null,

              cwlRoster:
                snapshots[tag] ||
                []
            };
        }
      }
    }
  }

  clanMap[wantedTag] =
    {
      tag:
        currentClan.tag,

      name:
        currentClan.name,

      clanLevel:
        currentClan.clanLevel,

      members:
        currentClan.members,

      memberList:
        currentClan.memberList,

      badgeUrls:
        currentClan.badgeUrls,

      type:
        currentClan.type,

      location:
        currentClan.location,

      chatLanguage:
        currentClan.chatLanguage,

      cwlRoster,

      cwlRosterSize:
        cwlRoster.length,

      cwlTownHallBreakdown:
        townHallBreakdown(
          cwlRoster
        ),

      townHallBreakdown:
        townHallBreakdown(
          cwlRoster
        )
    };

  const clans =
    Object.values(
      clanMap
    ).map(
      clan =>
        normalizeCWLClan(
          clan,
          clan.cwlRoster
        )
    );

  const selectedBreakdown =
    townHallBreakdown(
      cwlRoster
    );

  const completedRounds =
    rounds.filter(
      round =>
        round.wars.some(
          war =>
            war &&
            war.state ===
              "warEnded"
        )
    ).length;

  const preparationRounds =
    rounds.filter(
      round =>
        round.wars.some(
          war =>
            war &&
            war.state ===
              "preparation"
        )
    ).length;

  const activeRounds =
    rounds.filter(
      round =>
        round.wars.some(
          war =>
            war &&
            war.state ===
              "inWar"
        )
    ).length;

  return {
    ok: true,

    cwl: {
      tag:
        wantedTag,

      state:
        firstValue(
          leagueGroup.state,
          currentClanRaw.state,
          "unknown"
        ),

      season,

      warLeague:
        leagueGroup.warLeague ||
        null,

      totalRounds: 7,

      availableRounds:
        rounds.filter(
          round =>
            round.wars.length
        ).length,

      completedRounds,

      activeRounds,

      preparationRounds,

      currentClan,

      cwlRoster,

      cwlRosterSize:
        cwlRoster.length,

      townHallBreakdown:
        selectedBreakdown,

      cwlTownHallBreakdown:
        selectedBreakdown,

      badgeUrls:
        currentClan.badgeUrls
    },

    tag:
      wantedTag,

    clanTag:
      wantedTag,

    season,

    cwlRoster,

    cwlRosterSize:
      cwlRoster.length,

    townHallBreakdown:
      selectedBreakdown,

    cwlTownHallBreakdown:
      selectedBreakdown,

    currentClan,

    clans,

    rounds
  };
}

async function router(
  request,
  env
) {
  const url =
    new URL(request.url);

  const pathname =
    url.pathname;

  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status: 204,
        headers:
          corsHeaders(request)
      }
    );
  }

  if (
    pathname ===
    "/" ||
    pathname ===
    ""
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

  if (
    pathname ===
    "/player"
  ) {
    const tag =
      url.searchParams.get(
        "tag"
      );

    if (!tag) {
      return errorResponse(
        request,
        "Player tag wajib diisi."
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
        error.message ||
          "Gagal mengambil data player.",

        502
      );
    }
  }

  if (
    pathname ===
    "/clan"
  ) {
    const tag =
      url.searchParams.get(
        "tag"
      );

    if (!tag) {
      return errorResponse(
        request,
        "Clan tag wajib diisi."
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
        error.message ||
          "Gagal mengambil data clan.",

        502
      );
    }
  }

  if (
    pathname ===
    "/cwl"
  ) {
    const tag =
      url.searchParams.get(
        "tag"
      );

    if (!tag) {
      return errorResponse(
        request,
        "Clan tag wajib diisi."
      );
    }

    try {
      return json(
        await getCWL(
          tag,
          env
        ),

        request
      );

    } catch (error) {
      return errorResponse(
        request,
        error.message ||
          "Gagal mengambil data CWL.",

        502
      );
    }
  }

  return errorResponse(
    request,
    "Endpoint tidak ditemukan.",
    404
  );
}

export default {
  async fetch(
    request,
    env
  ) {
    try {
      return await router(
        request,
        env
      );

    } catch (error) {
      return errorResponse(
        request,
        error.message ||
          "Internal server error.",
        500
      );
    }
  }
};
