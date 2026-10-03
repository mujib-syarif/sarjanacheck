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
      members.map(
        normalizeMember
      );
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
  value
) {
  if (!env.CWL_ROSTER) {
    return false;
  }

  try {
    await env.CWL_ROSTER.put(
      key,
      JSON.stringify(value)
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

async function getCWL(
  tag,
  env
) {
  const wantedTag =
    cleanTag(tag);

  if (!wantedTag) {
    throw new Error(
      "Clan tag tidak valid."
    );
  }

  /*
   * Ambil current CWL group.
   */

  const leagueGroup =
    await getLeagueGroup(
      wantedTag,
      env
    );

  if (
    !leagueGroup ||
    !Array.isArray(
      leagueGroup.clans
    )
  ) {
    return {
      ok: true,

      tag: wantedTag,

      state:
        leagueGroup?.state ||
        "notFound",

      clans: [],

      rounds: [],

      completedRounds: 0,

      totalRounds: 0
    };
  }


  /* =======================================================
     1. AMBIL DETAIL SEMUA CLAN DI CWL
  ======================================================= */

  const clanDetailsMap = {};

  /*
   * leagueGroup.clans berisi clan yang
   * terdaftar dalam CWL.
   */

  const uniqueClanTags =
    [
      ...new Set(
        leagueGroup.clans
          .map(
            clan =>
              cleanTag(clan.tag)
          )
          .filter(Boolean)
      )
    ];


  /*
   * Fetch paralel supaya tidak lambat.
   */

  const clanResults =
    await Promise.all(
      uniqueClanTags.map(
        async clanTag => {
          try {
            const clan =
              await getClan(
                clanTag,
                env
              );

            return {
              tag: clanTag,
              clan
            };
          } catch {
            return {
              tag: clanTag,
              clan: null
            };
          }
        }
      )
    );


  for (
    const item
    of clanResults
  ) {
    if (item.clan) {
      clanDetailsMap[
        item.tag
      ] = item.clan;
    }
  }


  /* =======================================================
     2. ROSTER SNAPSHOT
  ======================================================= */

  const season =
    cwlSeasonKey(
      leagueGroup
    );

  const rosterKey =
    `cwl:${season}:${wantedTag}`;

  let storedRoster =
    await kvGet(
      env,
      rosterKey
    );


  /*
   * Hanya buat snapshot dari member
   * saat CWL masih preparation.
   */

  const isPreparation =
    String(
      leagueGroup.state || ""
    ).toLowerCase() ===
    "preparation";


  if (
    !storedRoster &&
    isPreparation
  ) {
    const snapshots =
      buildCwlRosterSnapshots(
        leagueGroup,
        clanDetailsMap
      );

    const selectedRoster =
      snapshots[wantedTag];


    if (
      Array.isArray(
        selectedRoster
      ) &&
      selectedRoster.length
    ) {
      storedRoster =
        selectedRoster;

      await kvPut(
        env,
        rosterKey,
        selectedRoster
      );
    }
  }


  /* =======================================================
     3. AMBIL SEMUA WAR TAG
  ======================================================= */

  const roundWarTags =
    [];

  if (
    Array.isArray(
      leagueGroup.rounds
    )
  ) {
    for (
      const round
      of leagueGroup.rounds
    ) {
      roundWarTags.push(
        ...roundWarTagList(round)
      );
    }
  }


  /*
   * Hilangkan duplikat,
   * tetapi pertahankan urutan ronde.
   */

  const uniqueWarTags =
    [
      ...new Set(
        roundWarTags
      )
    ];


  /* =======================================================
     4. FETCH SEMUA WAR
  ======================================================= */

  const warResults =
    await Promise.all(
      uniqueWarTags.map(
        async warTag => {
          const war =
            await getLeagueWar(
              warTag,
              env,
              wantedTag
            );

          return {
            warTag,
            war
          };
        }
      )
    );


  /*
   * Key harus menggunakan cleanTag()
   * agar lookup konsisten.
   */

  const warMap = {};

  for (
    const item
    of warResults
  ) {
    if (
      item.war &&
      !item.war.unavailable
    ) {
      warMap[
        cleanTag(
          item.warTag
        )
      ] = item.war;
    }
  }


  /* =======================================================
     5. ROUNDS
  ======================================================= */

  const rounds =
    [];

  if (
    Array.isArray(
      leagueGroup.rounds
    )
  ) {
    leagueGroup.rounds.forEach(
      (
        round,
        index
      ) => {
        /*
         * Cari war di ronde ini yang melibatkan
         * clan yang dicari (warMap hanya berisi
         * war milik clan tersebut).
         */

        const tags =
          roundWarTagList(round);

        const foundTag =
          tags.find(
            t => warMap[t]
          ) || null;

        const normalizedWarTag =
          foundTag ||
          tags[0] ||
          null;

        const war =
          foundTag
            ? warMap[foundTag]
            : null;

        rounds.push({
          round:
            index + 1,

          warTag:
            normalizedWarTag,

          state:
            war?.state ||
            "notAvailable",

          available:
            !!war,

          war
        });
      }
    );
  }


  /* =======================================================
     6. COMPLETED ROUND
  ======================================================= */

  const completedRounds =
    rounds.filter(
      round =>
        round.war &&
        (
          round.war.state ===
            "warEnded"
        )
    ).length;


  /* =======================================================
     7. KUMPULKAN SEMUA CLAN
  ======================================================= */

  const clanMap = {};


  /*
   * Clan dari CWL group.
   */

  for (
    const clan
    of leagueGroup.clans
  ) {
    const clanTag =
      cleanTag(
        clan.tag
      );

    if (!clanTag) {
      continue;
    }

    const detail =
      clanDetailsMap[
        clanTag
      ];

    clanMap[
      clanTag
    ] = {
      ...(detail || {}),
      tag:
        clanTag,

      name:
        firstValue(
          detail?.name,
          clan.name,
          clanTag
        ),

      clanLevel:
        number(
          firstValue(
            detail?.clanLevel,
            clan.clanLevel
          )
        )
    };
  }


  /*
   * Tambahkan clan dari seluruh
   * sisi war.
   *
   * Ini penting karena data war
   * juga menjadi sumber clan yang
   * mungkin tidak lengkap di
   * leagueGroup.
   */

  for (
    const round
    of rounds
  ) {
    const war =
      round.war;

    if (!war) {
      continue;
    }

    for (
      const side
      of [
        war.target,
        war.enemy
      ]
    ) {
      if (!side?.tag) {
        continue;
      }

      const clanTag =
        cleanTag(
          side.tag
        );

      if (
        clanMap[
          clanTag
        ]
      ) {
        continue;
      }

      const detail =
        clanDetailsMap[
          clanTag
        ];

      clanMap[
        clanTag
      ] = {
        ...(detail || {}),

        tag:
          clanTag,

        name:
          firstValue(
            detail?.name,
            side.name,
            clanTag
          ),

        clanLevel:
          number(
            firstValue(
              detail?.clanLevel,
              side.clanLevel
            )
          ),

        badgeUrls:
          normalizeBadge(
            detail || side
          )
      };
    }
  }


  /* =======================================================
     8. PASTIKAN CLAN YANG DICARI ADA
  ======================================================= */

  if (
    !clanMap[
      wantedTag
    ]
  ) {
    const selectedDetail =
      clanDetailsMap[
        wantedTag
      ];

    if (selectedDetail) {
      clanMap[
        wantedTag
      ] =
        selectedDetail;
    }
  }


  /* =======================================================
     9. NORMALIZE CLANS
  ======================================================= */

  const normalizedClans =
    Object.values(
      clanMap
    ).map(
      clan => {
        const clanTag =
          cleanTag(
            clan.tag
          );

        /*
         * Kalau ini clan yang dicari,
         * prioritaskan roster snapshot.
         */

        const roster =
          clanTag === wantedTag &&
          Array.isArray(
            storedRoster
          )
            ? storedRoster
            : [];

        return normalizeCWLClan(
          clan,
          roster
        );
      }
    );


  /* =======================================================
     10. JIKA ROSTER SNAPSHOT BELUM ADA
  ======================================================= */

  if (
    !storedRoster
  ) {
    const selectedClan =
      clanMap[
        wantedTag
      ];

    const currentMembers =
      Array.isArray(
        selectedClan?.memberList
      )
        ? selectedClan.memberList
        : [];

    if (
      currentMembers.length
    ) {
      storedRoster =
        currentMembers.map(
          normalizeMember
        );
    }
  }


  /* =======================================================
     11. SELECTED CLAN
  ======================================================= */

  const selectedClan =
    normalizedClans.find(
      clan =>
        cleanTag(
          clan.tag
        ) === wantedTag
    ) || null;


  /* =======================================================
     12. HAS DATA
  ======================================================= */

  const hasWarData =
    rounds.some(
      round =>
        !!round.war
    );


  /* =======================================================
     13. RESPONSE
  ======================================================= */

  return {
    ok: true,

    tag:
      wantedTag,

    state:
      leagueGroup.state ||
      null,

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

    roster:
      Array.isArray(
        storedRoster
      )
        ? storedRoster
        : [],

    rosterSize:
      Array.isArray(
        storedRoster
      )
        ? storedRoster.length
        : 0
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
